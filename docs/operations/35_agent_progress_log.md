# 35. Agent Progress Log

Date: 2026-06-14

This file is for Codex, Claude, and future agents. Do not move this content into `README.md`; the README is reserved for the Korean portfolio/project overview.

## How To Use

- Read this after `AGENTS.md`, the working rules, TODO board, and gap matrix.
- Keep entries short, evidence-based, and scoped to what was actually verified.
- Update this when folder organization, agent handoff context, or the current next-task sequence changes.
- Use `docs/qa/31_active_todo.md` for task status. Use this file for narrative handoff notes.

## Current Source Of Truth

| Area | Current Source |
| --- | --- |
| Active repo/worktree | `web-push-main/` |
| User-facing project overview | `README.md` |
| Agent rules | `AGENTS.md` |
| Live TODO | `docs/qa/31_active_todo.md` |
| Requirement gaps | `docs/qa/34_requirements_gap_matrix.md` |
| Verification evidence | local ignored `reports/` outputs plus summarized TODO notes |
| Repeatable scripts | `scripts/` |

## 2026-06-14 Folder/Docs Review

- Parent folder contains many legacy and experiment copies; current development must stay in `web-push-main/`.
- Root `AGENTS.md` points agents to `web-push-main/AGENTS.md`; do not treat root-level `block-editor.html`, `viewer.html`, `PLAN.md`, or `HANDOFF.md` as current truth.
- `README.md` in `web-push-main/` is a Korean portfolio-style overview. Keep it visual-first and do not add verification tables, agent-only status logs, or private sheet details there.
- Agent progress and handoff notes belong in this file plus `docs/qa/31_active_todo.md`.
- Real Roll20/user sheet fixtures and generated reports are local-only. Do not commit them to the public repo.
- Folder guide exists at the parent level as `폴더 안내.md`; update it only when actual top-level folder roles change.

## Local Evidence Snapshot

| Scope | Evidence |
| --- | --- |
| Browser L2 roundtrip | Local ignored `reports/roundtrip-browser/`; limited fixture scope only. |
| Mapping fidelity | Local ignored `reports/mapping-fidelity/`; selected private fixture scope only. |
| Edit flow smoke | Local ignored `reports/edit-flow-smoke/`; gallery drop and container nesting smoke. |
| Standalone preview cascade | Local ignored `reports/cascade-leak/`; standalone `buildSheetDoc` scope only. |
| Live preview/edit Shadow DOM cascade | Local ignored `reports/live-shadow-cascade/`; selected fixture scope only. |

## Next Development Sequence

1. Preview/edit screenshot comparison for the same imported fixture.
2. Asset loading parity: classify or cache external image resources that return 403 in browser fixtures.
3. Layer panel explicit before/after/inside drop zones.
4. Absolute positioning inside frames/groups with a clear UX mode.
5. Worker JS separate workspace plan and first source-preserving implementation slice.
6. Create a copyright-safe synthetic public example before re-enabling the sample loader.

## Reporting Guardrails

- Do not claim Roll20 visual parity yet.
- Do not claim all-sheet support yet.
- Do not collapse standalone preview evidence into live edit-mode evidence.
- Do not call auto-prefix real legacy sanitize.
- Do not edit protected external source corpus folders.
