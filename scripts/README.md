# Verification Scripts

Date: 2026-08-03

Run scripts from the repository root. Generated output belongs in ignored
`reports/`, `.tmp/`, or `test-fixtures/` paths.

## Core

| Command | Purpose |
| --- | --- |
| `corepack pnpm run ci:verify` | Safety and unit verification suite. |
| `corepack pnpm run lint` | Application lint. |
| `corepack pnpm run build` | Production build and type check. |
| `corepack pnpm run check:server-hygiene` | Find project-owned development, smoke, and browser-control listeners. |
| `corepack pnpm run guard:roll20-evidence` | Prevent tracked or staged local evidence. |
| `corepack pnpm run guard:docs-privacy` | Reject identifying or source-derived evidence in tracked Markdown. |
| `corepack pnpm run guard:ui-copy` | Detect broken user-facing copy. |

## Browser

| Command | Purpose |
| --- | --- |
| `corepack pnpm run smoke:edit-flow` | Persistent Preview/Edit iframe, selection, layer, flow/free, and result-card interaction. |
| `corepack pnpm run smoke:preview-edit-visual:synthetic` | Anonymous modern/legacy Preview/Edit visual equality. |
| `corepack pnpm run smoke:imported-edit-sync` | Anonymous import/edit/preview/re-import structure. |
| `corepack pnpm run smoke:fresh-sheet` | Empty-sheet creation and dimensions. |
| `corepack pnpm run smoke:import-dialog` | User import flow. |
| `corepack pnpm run smoke:export-dialog` | Export flow and compatibility controls. |
| `corepack pnpm run smoke:worker-state` | Controlled Sheet Worker and default-state behavior. |

## Roll20 Local Preparation

| Command | Purpose |
| --- | --- |
| `corepack pnpm run generate:roll20-sandbox-synthetic` | Create an ignored copyright-safe upload payload. |
| `corepack pnpm run verify:roll20-preupload` | Run payload, sanitizer, roundtrip, asset, and evidence gates before upload. |
| `corepack pnpm run status:roll20-actual -- <ignored-run-dir>` | Summarize one ignored actual-verification run. |
| `corepack pnpm run preflight:roll20-room-members` | Enforce the visible exactly-one participant boundary. |

Actual browser use follows
`docs/operations/37_roll20_actual_verification.md`. Custom Sheet Sandbox proves
modern mode only; legacy requires a new dedicated legacy-enabled test room.

## Privacy

- Never put external sheet names, source URLs, machine paths, room identifiers,
  screenshots, copied source, payloads, asset maps, or source-derived metrics in
  this file.
- Source-specific historical diagnostics are not product contracts. Audit their
  callers before deleting them, and replace any retained behavior with generic
  anonymous tests.
- A local script pass is not actual Roll20 parity.
