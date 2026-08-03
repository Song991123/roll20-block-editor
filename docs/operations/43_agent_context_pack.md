# Agent Context Pack

Date: 2026-08-03

This is the mandatory short startup route. Current files are compact and do not
contain private source evidence or historical test dumps.

## Current Control State

- Canonical worktree: `web-push-main/`; refresh branch and commit with Git.
- Active integration branch: `claude/design-reset`.
- Preview and Edit share one persistent Roll20 iframe.
- Modern and legacy compatibility paths are separate.
- Structural layer and friendly-widget selection channels are isolated.
- Public product assets contain no bundled real sheet sample.
- Actual modern Sandbox remains open. A dedicated legacy-room synthetic
  baseline now covers full-root rendering, translation, controls, Worker
  action state, Roll execution, and result-card output. Current foreground
  chat DOM metrics are captured, but the available chat image has a lossy
  source and stays diagnostic-only. The current structure check also finds
  different rendered content despite matching template class/row count;
  deterministic same-state lossless chat capture and broad-sheet parity remain
  open.
- Full-root diagnostics now compare the exact authored top-level element rather
  than the surrounding Roll20 wrapper. Authored-root dimensions agree for the
  current ignored synthetic legacy run, and the existing product baseline is
  closer than the tested generic CSS candidates. Both current anonymous legacy
  payloads now have actual element geometry/computed-style evidence for their
  applicable structure and controls. Collection counts agree and the evidence
  still does not justify a global renderer patch.
- Legacy settings handoffs include a read-only persisted-payload checker.
  Visible code editors must be replaced as whole documents; after save/reload,
  HTML/CSS source and translation JSON meaning must match before render capture.
  The Sandbox upload helper does not target legacy campaign settings.
- Modern automated upload is stopped at the supported file-selection permission
  boundary. A fresh dedicated Sandbox persisted an anonymous manifest and
  launched the visible upload tools, but its supported HTML chooser failed
  before transmission; do not bypass it.
- Sequential imports use monotonic store versions plus Blockly hydration
  generations in the emit-cache identity. The current five-fixture browser
  path also requires each mounted preview CSS hash to match the latest import,
  preventing a previous sheet from repainting the next one.
- The edit layer panel has a persisted, pointer- and keyboard-resizable width.
  One responsive track positions both its edge and the persistent iframe, so
  resizing editor chrome does not create a Preview/Edit coordinate split.
- Generated evidence and external validation inputs remain ignored, local, and
  ephemeral.

## Always Read

1. `AGENTS.md`
2. this context pack
3. `git status --short --branch`
4. `corepack pnpm run check:server-hygiene`
5. the one task-specific route below

## Task Routes

| Task | Read Next |
| --- | --- |
| Render/preview | `docs/spec/25_roll20_baseline.md`, `docs/spec/30_roll20_actual_sandbox_contract.md`, `docs/spec/31_asset_preservation_policy.md` |
| Import/export | `docs/spec/29_universal_roll20_mapping_contract.md`, `docs/spec/26_composite_blocks.md`, `docs/qa/34_requirements_gap_matrix.md` |
| Edit UX | `docs/ux/32_dom_layer_editing_plan.md`, `lib/editor/layerRoles.ts`, `docs/operations/42_claude_design_reset_handoff.md` |
| Roll20 browser | `docs/operations/37_roll20_actual_verification.md`, then only the active ignored run folder |
| Branch/CI/security | `docs/operations/34_branch_and_deployment_plan.md`, `docs/operations/36_public_portfolio_and_copyright_rules.md`, `.github/workflows/` |
| Progress/handoff | `docs/qa/31_active_todo.md`, `docs/operations/35_agent_progress_log.md` |
| Folder cleanup | `docs/operations/44_workspace_cleanup_inventory.md`, `docs/operations/45_workspace_harness_and_retention.md` |

## Product Invariants

- User HTML/CSS/translation and future JavaScript map generically; unsupported
  content stays explicit.
- Preview/Edit/export switch compatibility mode atomically.
- App CSS never enters the sheet iframe.
- Edit is Preview plus overlays, not a separately drawn surface.
- Flow/table/list structure remains valid; free placement is explicit and
  relative to an intended containing frame.
- Managed design choices emit CSS, not presentation inline HTML.
- Ordinary scripts stay inert and invisible; Sheet Worker support is a separate
  controlled workspace/runtime.
- Internal editor markers are stripped from Roll20 export.
- Existing Roll20 rooms are observation-only after an exact-one participant
  preflight. Generated writes use only modern Sandbox or a new dedicated test
  room.
- No source-specific parser, renderer, or UI branch.

## Evidence Language

- `DONE`: implemented and verified by the named current gate.
- `PARTIAL`: useful behavior exists but full scope is not proven.
- `VERIFY`: implementation exists and needs the named external/browser proof.
- `BLOCKED`: a named external boundary prevents that proof.
- `TODO`: not implemented or deliberately queued.

Local synthetic success is not actual Roll20 parity. One compatibility mode
cannot prove the other.

## Privacy Boundary

Never record or commit:

- external sheet or creator identity;
- source URL, distinctive source markup, class family, or asset URL;
- machine-local source path;
- room name or campaign identifier;
- source-derived count, percentage, geometry, screenshot, or per-sheet report;
- copied source, generated payload, or comparison artifact.

Convert a generic defect into an anonymous synthetic test, remove ephemeral
input, and record only the generic finding.

## Standard Verification

Run from the canonical worktree:

```powershell
corepack pnpm run ci:verify
corepack pnpm run lint
corepack pnpm run build
corepack pnpm run check:server-hygiene
```

Also run focused tests and the relevant browser smoke. After push, check the
exact GitHub Actions run for the pushed commit.

## Handoff

Use this order:

1. status;
2. branch and commit;
3. changed files;
4. commands and generic evidence;
5. unverified requirements;
6. next smallest actionable task.

Do not paste private evidence into a handoff.
