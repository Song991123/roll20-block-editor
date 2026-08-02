# Workspace Cleanup Inventory

Date: 2026-08-03

This file records current ownership classes, not a history of every cleanup
attempt.

## Active Product

| Path | Ownership | Action |
| --- | --- | --- |
| `app/`, `components/`, `hooks/`, `lib/` | Product source | Keep and edit only for an active task. |
| `public/` | Product assets | Keep only copyright-safe app assets. |
| `scripts/` | Verification and operations | Keep active generic tools; remove obsolete source-specific diagnostics after reference audit. |
| `.github/` | CI/CD | Keep and verify after workflow changes. |
| `docs/` | Current contracts and handoff | Keep compact; no private evidence or append-only test dumps. |
| `agent/` | Shared agent skills | Keep generic and platform-portable. |

## Local And Generated

| Path | Ownership | Default Action |
| --- | --- | --- |
| `.next/`, `out/` | Reproducible build output | Delete when no active smoke needs them. |
| `.tmp/` | Disposable working data | Delete after its task finishes. |
| `reports/` except policy files | Ignored evidence | Keep only while an active verification needs it. |
| `test-fixtures/` | Ignored local input | Keep only the minimum active anonymous or ephemeral input. |
| `node_modules/` | Active dependency runtime | Keep unless a dependency reinstall is explicitly planned. |

## Protected Or External

- External sheet sources are read-only and are not listed by concrete path.
- Git worktrees are moved or removed only through Git worktree operations.
- Parent compatibility roots remain fixed until every consumer and gate has a
  proven migration.
- User-authored files, source archives, and ambiguous material are retained.

## Current Cleanup Queue

- `DONE LOCAL`: compact tracked operating documents and remove obsolete
  source-derived status ledgers from the current tree.
- `DONE LOCAL`: add worktree, CI, and staged-document privacy checks.
- Audit source-specific legacy diagnostic scripts before deletion or generic
  replacement.
- Remove generated output only after listener, worktree, tracking, and resolved
  path checks pass.
- Decide whether public release uses a clean-history repository or an approved
  history rewrite.

## Verification

After structural cleanup:

1. `git status --short --branch`;
2. tracked/private evidence guard;
3. `corepack pnpm run guard:docs-privacy`;
4. `corepack pnpm run ci:verify`;
5. `corepack pnpm run lint`;
6. `corepack pnpm run build`;
7. server hygiene;
8. GitHub CI after push.
