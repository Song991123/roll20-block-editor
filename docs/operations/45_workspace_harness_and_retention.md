# Workspace Harness And Retention

Date: 2026-08-03

## Four Zones

The parent workspace uses four ownership zones:

1. `01_ACTIVE/`: pointers to active Git worktrees.
2. `02_REFERENCE/`: documentation for fixed compatibility/reference roots.
3. `03_ARCHIVE/`: retained recovery material; no new product work.
4. `04_LOCAL/`: disposable local evidence and generated output.

These are navigation and retention boundaries, not duplicate product copies.

## Canonical Worktree

- Product changes happen only in `web-push-main/`.
- Confirm the Git root before staging or committing.
- Do not treat sibling repositories or parent reference roots as interchangeable
  copies.
- Use one integration owner when several agents work in parallel.

## Retention Classes

### Keep

- tracked product source and current contracts;
- Git metadata and active worktrees;
- active dependency runtime;
- copyright-safe public assets;
- user-authored or ambiguous material;
- protected external source folders;
- the minimum local evidence needed by an active verification.

### Regenerate

- `.next/`;
- `out/`;
- temporary payloads;
- browser screenshots and comparison reports;
- anonymous generated fixtures;
- caches and transient logs.

### Remove After Verification

- stale generated output with no active process owner;
- obsolete temporary payloads and reports;
- empty generated directories;
- source-specific diagnostic tools only after all callers, package scripts,
  docs, and replacement gates are accounted for.

## Safe Deletion Procedure

1. Resolve the exact absolute target.
2. Confirm it is inside the intended workspace-owned generated root.
3. Confirm it is not Git-tracked, a worktree, protected source, dependency
   runtime, or user-authored material.
4. Inspect listeners and process command lines before stopping a process.
5. Delete only the verified target, using one shell and literal paths.
6. Confirm target absence and unrelated path preservation.
7. Run the relevant verification and update this inventory if ownership changed.

Never use a broad wildcard, repository reset, or cross-shell deletion pipeline.

## Evidence Retention

- External validation input is ephemeral.
- All screenshots, DOM/CSS captures, payloads, asset maps, and generated reports
  remain ignored and local.
- Tracked documents record generic findings and current status only.
- Public examples are synthetic and intentionally authored for publication, or
  they do not exist.

## Context Budget

- Startup reads are `AGENTS.md` plus the compact context pack.
- TODO, gap, and progress documents contain current state rather than full
  historical logs.
- Open only the task-specific contract named by the context pack.
- Generated reports are evidence targets, not reading queues.

The documentation cleanup reduced the changed Markdown set from about 2.90 MB
to 0.11 MB, or 96.1%, using Git object and worktree byte sizes. This measures
repository reading volume only; it is not a provider-token billing estimate.

## Server Hygiene

- Browser smokes may open a temporary local listener only for the run.
- Every smoke must close its browser and server in `finally` cleanup.
- Before final handoff, confirm zero project and browser-control listeners.
- Never terminate unrelated Node, Python, database, device, Codex, MCP, or
  desktop application processes without ownership proof.
