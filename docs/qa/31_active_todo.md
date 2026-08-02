# Active TODO

Date: 2026-08-03

This file contains current work only. Historical per-sheet evidence, source
identities, machine paths, screenshots, and source-derived measurements do not
belong in tracked documents.

## P0 - Roll20 Render Truth

- `VERIFY EXTERNAL`: apply a newly generated anonymous modern payload through
  the supported Custom Sheet Sandbox file chooser. Confirm initial sheet state,
  translation, worker behavior, Roll button output, result-card rendering,
  assets, and intrinsic sheet size. Keep all evidence ignored and local.
- `VERIFY EXTERNAL`: repeat the same generated-payload contract in a newly
  created dedicated legacy-enabled test room. Custom Sheet Sandbox does not
  prove legacy behavior.
- `BLOCKED EXTERNAL`: the current automated modern upload path is stopped at
  the browser file-selection permission boundary. No hidden input, endpoint,
  or existing-room workaround is allowed.
- `TODO`: compare local Preview/Edit against the two actual Roll20 destinations
  with the same generated payload and classify differences by wrapper,
  baseline CSS, authored CSS, state/default attributes, translation, worker,
  result-card/chat, assets, or viewport/crop.

## P0 - Universal Import And Export

- `PARTIAL`: HTML, CSS, translation, Rolltemplate, and a useful Sheet Worker
  subset map to editable blocks. Unsupported content must remain explicit and
  lossless instead of disappearing.
- `PARTIAL`: modern and legacy output are separate contracts. Selector
  prefixing, modern Sandbox preparation, and legacy CSS sanitizing must never
  be reported as the same operation.
- `TODO`: expand anonymous synthetic coverage for uncommon table/list/form,
  conditional visibility, repeating sections, complex selectors, fonts,
  assets, and unsupported worker syntax.
- `TODO`: give future JavaScript work its own inert source workspace and block
  mapping. Ordinary page scripts must remain invisible and non-executable in
  Preview/Edit.

## P0 - Edit And Preview Unity

- `DONE LOCAL`: Preview and Edit use one persistent Roll20 iframe. Edit adds
  parent-owned controls and overlays instead of drawing a second sheet.
- `DONE LOCAL`: flow-aware before/inside/after moves, explicit free placement,
  grouping, container roles, table/list guards, layer auto-scroll, and
  collapsed-container opening have synthetic browser coverage.
- `DONE LOCAL`: structural layer selection and friendly-widget selection use
  separate iframe markers. Three consecutive full browser runs preserved
  multi-selection through the forced collision case and later multi-object
  movement with no console or page errors.
- `PARTIAL`: continue usability review for dense imported structures, nested
  absolute placement, keyboard selection, resize handles, and undo/redo.

## P1 - User Experience

- `PARTIAL`: visual controls exist for sections, rows, text, inputs, images,
  tables, Roll buttons, and result cards. They write managed CSS rather than
  presentation inline HTML.
- `TODO`: remove remaining technical or broken copy from user-facing panels.
  Prefer plain Korean actions, icons with tooltips, and visual examples.
- `TODO`: validate the pastel application shell at desktop and compact
  viewports without changing the Roll20 sheet render surface.
- `TODO`: add resize and alignment affordances only where they preserve the
  authored DOM and CSS contract.

## P1 - Copyright And Privacy

- `DONE CURRENT TREE`: no real or derived sheet source, screenshot, generated
  report, or public sample belongs in tracked product assets.
- `DONE LOCAL`: compact tracked operating documents to current generic
  findings and remove unreferenced historical corpus ledgers from the current
  tree.
- `DONE LOCAL`: deterministic CI and pre-commit checks reject machine paths,
  source fixture labels, direct campaign identifiers, source URLs in sensitive
  evidence, and source-derived measurement records.
- `VERIFY HISTORY`: removed current-tree records may still exist in Git history.
  A clean-history repository or an explicitly approved history rewrite is
  required before claiming historical purge.

## Quality Gate

Every coherent code batch must pass:

- focused tests for the changed contract;
- `corepack pnpm run ci:verify`;
- `corepack pnpm run lint`;
- `corepack pnpm run build`;
- relevant browser smoke;
- `git diff --check`;
- project server hygiene;
- GitHub CI after push.

Local synthetic success is not actual Roll20 parity. Keep the full product goal
open until modern and legacy actual-screen evidence both pass with a current
generated payload.
