# 45. Workspace Harness and Retention Policy

Date: 2026-07-29
Status: ACTIVE

This document defines the four-zone workspace harness. The zones are an
operating boundary for agents, not a second copy of the product source.

## Four Zones

| Zone | Ownership | Allowed contents | Retention |
| --- | --- | --- | --- |
| `01_ACTIVE/` | navigation | pointers to active worktrees only | permanent marker |
| `02_REFERENCE/` | compatibility | descriptions of fixed roots and read-only reference policy | permanent marker |
| `03_ARCHIVE/` | recovery | preserved legacy tools and old experiments that still have recovery value | keep until explicit archive review |
| `04_LOCAL/` | disposable evidence | instructions for ignored reports, fixtures, build output, and temporary files | disposable and reproducible |

The canonical product remains `web-push-main/`. The parent `web/` worktree and
the parent-level `sheet/`, `roll20-base/`, `api/`, `docs/`, and `cache/` roots
stay at their compatibility paths until a separate path-migration task proves
all consumers can move safely.

## Retention Classes

### Preserve

- Product source, Git metadata for active worktrees, hand-authored operating
  documents, and protected external source folders.
- Roll20 baseline CSS and API references required by the current renderer.
- Local fixtures and reports required by an active verification task.

### Archive

- Legacy viewer/editor material, old single-file backups, and experiments with
  useful recovery context. Archive intact before considering deletion.

### Recreate or delete

- `node_modules/`, `.next/`, `out/`, debug logs, TypeScript build info, empty
  report folders, duplicate local screenshots, and stale package caches.
- Broken Git metadata snapshots only after `git worktree list --porcelain`,
  reference search, and process checks show they are unused.

## Deletion Gate

An agent may delete a target only when all conditions below are recorded:

1. The absolute target path is inside the workspace or is an explicitly named
   stale metadata target.
2. The target is not Git-tracked source and is not one of the protected roots.
3. `git worktree list`, process/listener checks, and reference search show no
   active consumer.
4. The target is generated, duplicated, or recoverable by a documented command.
5. The post-delete check confirms the active worktree is clean and the server
   hygiene check still passes.

Never use broad `git clean`, wildcard deletion, or a recursive delete whose
final resolved path was not checked. Ambiguous or user-authored material stays.

## Current Cleanup Ledger

The 2026-07-29 inventory found these generated or stale candidates:

- Old `web/` generated folders: `node_modules/` 464.53 MiB, `.next/` 195.06
  MiB, and `out/` 6.52 MiB. They are ignored and untracked.
- Active `web-push-main/` generated folders: `.next/` 19.73 MiB and `out/`
  2.99 MiB, plus `debug.log` and `tsconfig.tsbuildinfo`.
- Duplicate local visual reports: `reports/preview-edit-visual/` and
  `reports/preview-edit-visual-rerun/`. The final same-day report is retained.
- Root `.git.broken-20260510-222058/` and `.pnpm-store/` are unused snapshots
  or cache metadata with no active reference found.

The current shell safety policy blocked the destructive deletion attempt in
this run, so these candidates remain on disk until the deletion gate can be
completed. No protected source or active product file was deleted.

## Harness Review Checklist

- Start from `web-push-main/AGENTS.md` and this document.
- Check listeners before starting or stopping a server.
- Keep real or derived Roll20 sheets out of Git and public examples.
- Keep active verification evidence under ignored paths only.
- Update `docs/operations/44_workspace_cleanup_inventory.md` after every
  structural or retention change.
- Report `preserved`, `archived`, `deleted`, and `not deleted` separately.

## 2026-07-29 third-pass retention result

The active worktree had no listeners, and the explicit target inventory showed
no tracked product files or protected source overlap. Two single-file generated
artifacts were removed safely:

- `web-push-main/debug.log`
- `web-push-main/tsconfig.tsbuildinfo`

The following generated directories and stale metadata remain **not deleted**:
the old `web/node_modules/`, `web/.next/`, `web/out/`, the active
`web-push-main/.next/` and `out/`, the duplicate local visual report folders,
root `.git.broken-20260510-222058/`, and root `.pnpm-store/`. The host safety
policy rejected recursive directory deletion, so no recursive workaround was
used. They remain reproducible cleanup candidates for a permitted maintenance
operation; they must not be reported as deleted.

## 2026-07-29 fourth-pass user-authorized retry

The user explicitly authorized another deletion attempt after the previous
host rejection. The following exact paths were re-resolved, checked as
generated/stale and untracked, and confirmed to have no active listener:

- old `web/node_modules/`, `web/.next/`, and `web/out/`;
- active `web-push-main/.next/` and `web-push-main/out/`;
- duplicate `web-push-main/reports/preview-edit-visual-rerun/`;
- root `.git.broken-20260510-222058/` and `.pnpm-store/`.

The native recursive deletion command was rejected by the host safety policy
again. No alternate shell, per-file loop, or safety bypass was used. All eight
targets remain **not deleted**; active dependencies, canonical reports,
fixtures, protected roots, and both worktrees were preserved.

## 2026-07-30 fifth-pass user-authorized retry

The user authorized another cleanup attempt. The eight exact targets were
resolved again, and the project worktrees had no active development listener.
The host safety policy rejected both the explicit multi-target command and a
single-target absolute-path recursive command before execution. No target was
deleted, and no safety bypass, alternate shell, or per-file workaround was
used. All eight targets remain **not deleted**.

## 2026-07-30 sixth-pass user-authorized retry

The user authorized a further retry after the fifth-pass rejection. The same
eight absolute targets were revalidated as generated or stale, untracked, and
outside protected source ownership, with no matching project process or
development listener. The host rejected the native `Remove-Item -Recurse`
operation before execution again. No target was deleted, and no alternate
shell, per-file deletion, or safety bypass was used. All eight targets remain
**not deleted**.

## 2026-07-30 ninth-pass user-authorized retry

The user authorized another deletion attempt. The nine exact targets in the
cleanup ledger were re-resolved as generated output, duplicate local evidence,
stale cache, or unused Git metadata. No project listener was running, and the
active dependency tree, fixtures, final reports, protected roots, and both
worktrees were excluded. The host rejected the guarded recursive deletion
operation before execution. No alternate shell, per-file workaround, or safety
bypass was used; all nine targets remain **not deleted**.
