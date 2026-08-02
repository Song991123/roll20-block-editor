# Multi-Agent Render Plan

Date: 2026-08-03

## Ownership

| Role | Owns | Must Not Change |
| --- | --- | --- |
| Lead Codex | Integration, Preview/Edit contract, final tests, pushes | Nothing outside active task without review |
| Mapping agent | HTML/CSS/translation/worker import and emit | Renderer CSS, app design, status docs |
| Edit UX agent | Layers, drag/drop, overlays, inspector interaction | Import semantics, Roll20 baseline |
| Design agent | Application shell, plain Korean copy, accessibility | Sheet iframe CSS, mapping/runtime behavior |
| QA/security agent | CI, privacy guards, performance/security audits | Product behavior without a separate approved patch |
| Research agent | Official docs and generic implementation notes | Third-party source copying or product edits |

## Branching

- One lead owns the integration branch and push.
- Every writing agent uses a separate short-lived branch.
- Read-only research produces a concise generic handoff.
- Do not let two agents edit the same high-conflict file concurrently.
- Rebase or cherry-pick only after focused tests pass on the source branch.

## Safe Parallel Sets

- Mapping tests and app-shell design may run in parallel when they touch
  separate files.
- CI/privacy work may run beside read-only research.
- Preview renderer, EditCanvas, layer panel, and shared store changes stay under
  one owner at a time.
- Roll20 authenticated browser work stays under one visible operator.

## Shared Gates

Every code handoff includes:

- focused tests;
- `corepack pnpm run ci:verify`;
- `corepack pnpm run lint`;
- `corepack pnpm run build`;
- relevant browser smoke;
- `git diff --check`;
- server hygiene;
- changed files and conflict risk.

## Evidence Rules

- Use committed anonymous synthetic tests for generic defects.
- External validation inputs and all evidence are ephemeral and ignored.
- Never send source identity, URL, local path, screenshot, payload, room name,
  distinctive markup, or source-derived measurement between agents.
- Actual Roll20 writes use only modern Sandbox or a new dedicated test room.
- One destination never proves both modern and legacy behavior.

## Integration Order

1. Review source branch diff and ownership boundary.
2. Run its focused tests.
3. Integrate one branch at a time.
4. Resolve conflicts in favor of the current product contract, not whichever
   branch is newest.
5. Run the full shared gates once all selected branches are integrated.
6. Update compact TODO/progress files.
7. Push and verify GitHub CI for the exact commit.

## Stop Conditions

- private evidence appears in a tracked diff;
- a branch adds source-specific behavior;
- a renderer change lacks a generic synthetic nonregression;
- an existing Roll20 room would be modified;
- participant state is not visibly exactly one;
- a temporary server cannot be attributed safely.
