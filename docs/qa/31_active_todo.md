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
- `DONE ACTUAL SYNTHETIC`: a dedicated owner-only legacy-enabled test room
  rendered fresh anonymous payloads with the expected wrapper, translation,
  controls, flow/table layout, intrinsic roots, action-driven Sheet Worker
  state change, Roll execution, and custom result card. Lossless root segments,
  full-root stitching, DOM evidence, and actual-status checks remain ignored
  local evidence. This proves the tested synthetic contract, not every sheet.
- `BLOCKED EXTERNAL`: the current automated modern upload path is stopped at
  the browser file-selection permission boundary. A fresh visible chooser
  retry for a newly exported anonymous modern payload still returns
  `Not allowed` before any file is transferred. No hidden input, endpoint, or
  existing-room workaround is allowed.
- `PARTIAL`: local Preview/Edit and the dedicated legacy destination now have
  same-payload root comparisons against the exact authored top-level element,
  not the surrounding Roll20 wrapper. Authored-root dimensions and capture
  completeness agree, and the current product baseline is closer than the
  tested generic CSS candidates. Both current anonymous legacy payloads now
  have actual element geometry/computed-style evidence for their applicable
  structure and controls; collection counts agree and the remaining visible
  deltas do not justify a global renderer patch. The renderer-action gate
  holds, broad-sheet parity is not proven, and modern comparison remains open.
- `DONE TOOLING`: generated handoffs now include a read-only persisted-payload
  check for dedicated legacy settings. It distinguishes exact HTML/CSS,
  newline normalization, translation JSON formatting normalization, missing
  fields, and real source mismatch. The Sandbox upload helper no longer treats
  legacy campaign settings fields as a supported upload destination.
- `PARTIAL ACTUAL`: Roll-capable and non-Roll payloads now share one chat
  applicability rule across status, capture planning, metric audit, and pixel
  diagnostics. Current foreground DOM/style/font evidence passes for the
  tested non-table result card, while table-only metrics are conditional. The
  available browser screenshot is a crop derived from a lossy viewport source,
  so it remains diagnostic-only and the renderer-action gate correctly holds.
  The structure comparator now discovers the current run instead of using old
  fixed fixture names and skips payloads without Roll capability. Its current
  comparison finds matching template class/row count but different rendered
  content, so a deterministic same-state recapture plus a lossless source PNG
  is still required for chat pixel conclusions.

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
- `DONE LOCAL`: the edit toolbar keeps its stable single-row canvas offset at
  a compact desktop viewport. Dense text controls use accessible icon buttons,
  and the edit-flow browser smoke checks vertical overflow and control names.
- `DONE LOCAL`: compact desktop widths keep every main mode, edit target,
  language, modern/legacy, and upload-rule control visible. Labels collapse to
  named icon controls with tooltips, and browser smoke checks clipping and
  horizontal overflow.
- `DONE LOCAL`: eligible visual layers expose direct resize handles on the same
  persistent iframe surface. The iframe element follows the pointer before
  release; pointer-up writes width/height to managed CSS, removes the temporary
  inline preview, and preserves identical geometry in Preview and Edit. Flow
  layers keep their anchored edges, while absolute layers expose all edges and
  corners. Ordinary inline text and table-row structure stay excluded, while
  inline images remain directly resizable.
- `PARTIAL`: continue usability review for dense imported structures, nested
  absolute placement, keyboard selection, alignment, and undo/redo.

## P1 - User Experience

- `PARTIAL`: visual controls exist for sections, rows, text, inputs, images,
  tables, Roll buttons, and result cards. They write managed CSS rather than
  presentation inline HTML.
- `PARTIAL`: common block-add, import-safety, and export-diagnostic messages now
  use plain Korean instead of internal workspace, payload, runtime, or browser
  handler terms. The UI copy guard parses source literals and JSX text so
  internal comments do not hide or falsely trigger this rule. Continue the
  review for less-used panels and add visual examples where text alone is hard.
- `PARTIAL`: the pastel shell and central editing controls have compact desktop
  browser coverage. Mobile drawers and broader viewport combinations remain to
  be reviewed without changing the Roll20 sheet render surface.
- `TODO`: add alignment affordances only where they preserve the authored DOM
  and CSS contract.

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
