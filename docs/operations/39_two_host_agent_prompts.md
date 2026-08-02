# Two-Host Agent Prompts

Date: 2026-08-03

Replace `<repo>` and `<branch>` locally. Never put machine paths or private
source details back into this tracked file.

## Lead Codex

```text
Work in <repo> on <branch>. Read AGENTS.md and the compact context pack first.
Own integration, the shared Preview/Edit iframe contract, status documents,
final verification, push, and CI follow-up. Review other branches before
integrating. Keep modern and legacy Roll20 contracts separate. Do not record or
commit external sheet identity, source, paths, screenshots, payloads, or
source-derived measurements. Existing Roll20 rooms are observation-only after
an exactly-one participant preflight. Generated writes use only modern Sandbox
or a new dedicated test room. Run focused tests, ci:verify, lint, build,
relevant browser smoke, diff check, and server hygiene. Report DONE/PARTIAL/
VERIFY/BLOCKED honestly.
```

## Secondary Codex - Edit UX

```text
Work in <repo> on a separate codex/* branch. Read AGENTS.md, the context pack,
the DOM layer editing plan, and layerRoles.ts. Own only Figma-like direct
manipulation: shared iframe overlays, layer visibility, before/inside/after,
flow/free placement, grouping, nested absolute placement, selection, resize,
alignment, undo/redo, and drag latency. Preserve DOM validity and model/Edit/
Preview/export/re-import agreement. Use anonymous synthetic tests only. Do not
change importer semantics, Roll20 baseline, status docs, or app redesign files.
Run focused editor tests, edit-flow browser smoke, ci:verify, lint, build, diff
check, and server hygiene. Commit and push the branch, then hand off changed
files, tests, conflict risk, and remaining VERIFY items.
```

## Claude Code - Mapping

```text
Work in <repo> on a separate claude/* branch. Read AGENTS.md, the context pack,
the universal mapping contract, composite contract, and asset policy. Own only
generic HTML/CSS/translation/Sheet Worker import, block representation, emit,
fallback, and modern/legacy separation. Unsupported source must remain explicit
and lossless. Ordinary scripts stay inert and invisible. Remove source-specific
branches if found and replace them with anonymous synthetic regressions. Do not
edit renderer CSS, ChatPane, EditCanvas, layer panel, app design, or status
documents. Run focused mapping tests, ci:verify, lint, build, diff check, and
server hygiene. Commit and push, then provide a generic handoff with no private
evidence.
```

## Claude Code - Product Design

```text
Work in <repo> on a separate claude/* branch. Read AGENTS.md, the context pack,
and the design handoff. Redesign only the application shell and user-facing
copy. Use an original light pink/pastel visual language, plain Korean actions,
Lucide icons with tooltips, accessible contrast, and compact work-focused
layout. Do not imitate Roll20, touch iframe/baseline/user CSS, change mapping or
runtime behavior, add login claims, expose repository links, or bundle sheet
samples. Preserve test IDs and functional layout contracts. Verify desktop and
compact screenshots, accessibility basics, lint, build, UI-copy guard, relevant
browser smoke, diff check, and server hygiene. Commit and push the branch, then
hand off screenshots only through ignored local evidence.
```

## QA And Security

```text
Work read-only first in <repo>. Audit CI/CD, dependency and bundle cost,
untrusted import boundaries, script execution, unsafe URLs, private evidence,
public samples, and clean-clone behavior. Do not delete or rewrite user source.
Propose the smallest generic guard, add a synthetic self-test, run ci:verify,
lint, build, diff check, and server hygiene, then commit on a separate branch.
Do not include private strings in the guard or handoff.
```
