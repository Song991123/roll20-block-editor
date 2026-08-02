# Project Structure

Date: 2026-08-03

## Active Repository

| Path | Purpose |
| --- | --- |
| `app/` | Next application routes and global shell. |
| `components/` | Editor, preview, inspector, dialog, and UI components. |
| `hooks/` | Shared React behavior. |
| `lib/` | Import, block model, emit, preview/runtime, export, stores, and domain logic. |
| `public/` | Copyright-safe application assets only. |
| `scripts/` | Generic repeatable verification and operations tools. |
| `docs/` | Current product, QA, UX, and operations contracts. |
| `agent/` | Shared agent skills and repository-local workflow guidance. |
| `.github/` | CI/CD workflows and repository automation. |

## Ignored Local Areas

| Path | Purpose |
| --- | --- |
| `test-fixtures/` | Minimum anonymous or ephemeral verification input. |
| `reports/` | Generated local evidence; only policy files are tracked. |
| `.tmp/` | Disposable payloads and intermediate files. |
| `.next/`, `out/` | Reproducible build output. |

Real sheet sources, screenshots, asset maps, generated reports, and exported
payloads never belong in tracked public assets.

## Parent Workspace

The parent workspace contains the canonical worktree, fixed compatibility
roots, recovery material, and local evidence zones. Concrete external source
paths are intentionally omitted. Follow the parent `AGENTS.md` and
`docs/operations/45_workspace_harness_and_retention.md` before moving or
deleting anything.

## Status Sources

- `docs/operations/43_agent_context_pack.md`: startup and current control state.
- `docs/qa/31_active_todo.md`: current tasks only.
- `docs/qa/34_requirements_gap_matrix.md`: requirement status and next proof.
- `docs/operations/35_agent_progress_log.md`: compact recent handoff.

Do not recreate append-only histories in these files. Git already records code
history; tracked documents should stay current, compact, and privacy-safe.
