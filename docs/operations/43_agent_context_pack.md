# 43. Agent Context Pack

Date: 2026-08-01

This is the short reading path for agents. It prevents every task from loading
the entire history and generated evidence tree.

## Current Control State

- Canonical worktree: `web-push-main/`; refresh branch/commit with Git before
  editing.
- Local preview/edit share one persistent iframe. Modern and legacy browser
  smoke currently pass, including delayed stale-revision rejection.
- Direct edit exposes managed CSS controls plus 35 generic starting styles
  for sections, Roll buttons, text, inputs, table surfaces/rows/cells, result
  cards, and result rows. Buttons and ordinary inputs can edit separate base,
  hover, active, and focus states. Frame/flow sections can also author a remote
  background image with fit, repeat, and 3x3 position controls, then choose
  visual accent side/color/width, shadow, corner, and inner-spacing treatments.
  Direct title/label text blocks can choose plain/underline/side/band/tag
  treatment, palette/custom color, alignment, size, and weight without changing
  their tag or text. Direct image blocks can choose original/fill/fit/stretch,
  a 3x3 focal position, opacity, and corner shape while preserving their source,
  alternative text, and dimensions; CSS-backed icon glyphs are excluded.
  The authoring path accepts only HTTP(S), warns on HTTP, preserves imported complex
  backgrounds until explicit replacement. Direct Roll buttons expose built-in
  d20 icon visibility, size, text gap, opacity, and color without replacing
  Roll20's glyph or `dicefontd20` family. Both controls emit managed CSS that
  remains visible in the shared Edit/Preview iframe. Managed selectors beat the Roll20 base
  without inline presentation or `!important`; template-child rules are scoped
  through their owning `.sheet-rolltemplate-NAME`. Result-card root rules use
  that same Roll20 class directly and migrate with template-name changes. The
  rolltemplate submode now uses the same chat
  renderer as the roll history: users can select a template root or child,
  edit the outer card and common child presentation through managed CSS, and drop template-specific
  rows/text into flow. The persistent sheet iframe remains mounted separately,
  so card width cannot reflow the sheet. Blockly template-name changes migrate
  root and descendant managed CSS to the new chat scope. This editor is exposed
  as the icon-labelled `주사위 결과` target beside `시트 디자인`; user-facing
  creation, picker, gallery, and block labels call the surface a result card
  instead of a result frame. Section background and
  section-decoration paint, title/label paint, image paint, and Roll-button icon
  paint plus modern/legacy sanitizer preservation are locally browser-verified.
  Result-card roots now expose four coordinated themes that explicitly style
  the card, generic headings, result rows, first structural labels, and
  semantic/bold result values together. Unclassified imported body text is not
  guessed or changed. The same theme definitions seed newly created cards and
  the editor/chat browser smoke verifies the coordinated rose theme.
  Sheet frame/flow roots now also expose four coordinated section themes. An
  explicit click styles the selected frame and nearby semantic title/eyebrow
  layers through managed CSS, stops at nested section boundaries, and excludes
  ordinary field labels/body/input layers from direct theme targeting. The
  same paper root definition seeds a newly created section box. Synthetic
  browser evidence verifies coordinated frame/title paint and preserved field
  label paint in both render modes. Commit `937caa6` is pushed to
  `claude/design-reset`, and GitHub CI run `30679762722` passed.
  Input/button rows now expose four coordinated whole-row themes instead of the
  broader section gallery. Eligibility requires a row/field wrapper with a
  direct ordinary control or action, does not traverse nested rows, and excludes
  hidden/toggle/file controls. Browser smoke verifies coordinated label/input
  and input/Roll-button paint while preserving the Roll command and Roll20 d20
  icon contract. Full `ci:verify`, lint, and production build pass locally.
  Commit `9fbf908` is pushed to `claude/design-reset`; GitHub CI run
  `30680689365` passed. This is not arbitrary-sheet actual Roll20 parity.
  Direct Roll buttons now additionally expose four whole-button designs that
  coordinate base, hover, active, focus, and the native d20 pseudo-element.
  Base mode shows the visual gallery; state tabs and icon controls remain for
  fine tuning. Whole-design reapply clears stale state-only shape/spacing/type
  overrides. Local browser smoke verifies Edit/Preview base, hover, focus, and
  icon behavior. Modern/legacy sanitizer tests preserve the generated rules,
  and generic synthetic Preview/Edit comparison stays exact in both modes;
  commit `9d89ef3` is pushed to `claude/design-reset` and GitHub CI run
  `30681492063` passed. An actual modern Sandbox upload remains pending.
  Eligible frame/flow sections now also expose four structure-aware inside
  layouts: stack, wrapping row, equal two columns, and 2:1 sidebar. Applying a
  layout preserves HTML child order, spans only confident direct title/eyebrow
  children, and excludes control groups, childless roots, and Rolltemplates.
  Browser smoke proves real reflow and exact final computed layout across the
  shared Edit/Preview iframe. Commit `b14247c` is pushed to
  `claude/design-reset`; GitHub CI run `30681986753` passed. Actual modern and
  legacy Roll20 upload proof remains open.
  The inspector now presents four complete-section designs before low-level
  controls: paper stack, rose two-column, mint wide/narrow, and ink row. One
  explicit click combines the existing theme and layout contracts without
  wrappers or HTML reordering. Independent layout/color galleries remain under
  the collapsed `배치와 색 따로 바꾸기` control. Browser smoke verifies the
  full mint composition and exact Edit/Preview computed output. Commit
  `d481a48` is pushed to `claude/design-reset`; GitHub CI run `30682502247`
  passed. Actual modern and legacy Roll20 paint remains unverified.
- Actual Roll20's built-in default chat-template DOM and typography were
  measured in the dedicated one-member modern Sandbox. The local fallback now
  matches its caption/row/inline-roll structure and passes browser smoke.
  DPR-normalized smoke reproduces exact table/caption geometry; text/edge
  pixel raster remains open and must not be called visual parity.
- The current anonymous custom result-card proof measured Roll20's chat shell
  at `340px`, its rolltemplate root at `279px`, and the painted card at
  `283.2px`. ChatPane now exposes that full shell and custom inline fields use
  Roll20's `.inlinerollresult` markup instead of the removed app-only
  `total + [raw dice]` duplication. Exact-payload local smoke reports clipping
  `false`; the full `ci:verify` gate passes. This is one synthetic legacy-room
  proof, not universal chat parity.
- One anonymous generated legacy fixture now has actual same-payload editor
  readback, render, worker, and roll proof in a new dedicated one-member test
  room. HTML/CSS readback is byte-identical; Translation is semantically
  identical after Roll20 formatting. A supported tab-CDP capture now provides
  a true lossless `760x320` CSS / `950x400` physical root PNG. At physical
  DPR `1.25`, the authoritative threshold-`90` residual is `3.1353%`; all
  `11,914` mismatches are inside glyph/control/table/border paint regions,
  while `160,712` plain-background pixels have zero threshold mismatches.
  Sampled geometry and computed styles match exactly for this fixture, so no
  generic CSS patch is justified. Arbitrary-sheet visual parity remains open.
- Modern generated same-payload evidence remains `0/4`. Its visible upload
  route is blocked before transmission until Chrome extension file-URL access
  is enabled; do not use hidden-input or endpoint workarounds.
- Generated `.next/`, `out/`, `.tmp/`, and report outputs are disposable. Real
  or derived sheets and screenshots stay local, ignored, and uncommitted.

## Tier 0: Always Read

1. `AGENTS.md`
2. `docs/operations/43_agent_context_pack.md`
3. `git status --short --branch`
4. `corepack pnpm run check:server-hygiene`

Do not read `31_active_todo.md`, `34_requirements_gap_matrix.md`, or
`35_agent_progress_log.md` from top to bottom. They are append-only histories.
Use `rg -n` to find the current heading or named topic, then open only that
range, normally no more than 160 lines.

## Tier 1: Read By Task

| Task | Read next |
| --- | --- |
| Render/preview | `docs/spec/25_roll20_baseline.md`, `docs/spec/30_roll20_actual_sandbox_contract.md`, `docs/spec/31_asset_preservation_policy.md` |
| Import/export | `docs/spec/29_universal_roll20_mapping_contract.md`, `docs/qa/34_requirements_gap_matrix.md` |
| Edit UX | `docs/ux/32_dom_layer_editing_plan.md`, `lib/editor/layerRoles.ts`, `docs/operations/42_claude_design_reset_handoff.md` |
| Roll20 browser | `docs/operations/37_roll20_actual_verification.md`, then only the named ignored report |
| Branch/CI/security | `docs/operations/34_branch_and_deployment_plan.md`, `docs/operations/36_public_portfolio_and_copyright_rules.md`, `.github/workflows/` |
| Product rules | Relevant section of `docs/operations/33_working_rules_and_requirements.md` |
| Progress/handoff | Current section of `docs/qa/31_active_todo.md` and `docs/operations/35_agent_progress_log.md`, then `docs/operations/39_two_host_agent_prompts.md` |
| Folder cleanup | `docs/operations/45_workspace_harness_and_retention.md` and current section of `docs/operations/44_workspace_cleanup_inventory.md` |

## Tier 2: Open On Demand

- `reports/` is generated evidence, not a reading queue.
- `test-fixtures/` is local-only copied input, not product source.
- `.next/`, `out/`, `.tmp/`, `debug.log`, and caches are generated or
  diagnostic byproducts.
- Parent-folder source corpora, old worktrees, and experiment copies are not
  active workspaces and must not be edited.

## Context Budget Baseline

The previous mandatory startup opened seven full files: `2,249,317` UTF-8
bytes and `24,448` lines. A rough, fixed comparison (`bytes / 3.5`) is
`642,662` tokens. This is a navigation estimate, not provider billing data.

The new mandatory core is only `AGENTS.md` plus this context pack. Record its
current baseline is `12,045` UTF-8 bytes, `181` lines, and about `3,442`
tokens by the same estimate: a `99.46%` startup-context reduction. Task-specific
files are added only when the task route requires them. Do not claim Caveman's
Claude-log statistics as Codex usage; record them only on a host where its hook
can read the matching session log.

## Handoff Format

Every agent handoff uses this order:

1. status: DONE / VERIFY / BLOCKED / TODO;
2. exact branch and commit;
3. changed files;
4. commands and evidence;
5. remaining risks and conflict files;
6. next smallest actionable task.

Never paste private source, source identity, asset URLs, screenshots, or
source-derived measurements into the handoff.
