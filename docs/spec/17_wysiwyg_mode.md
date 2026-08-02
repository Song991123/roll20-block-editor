# WYSIWYG Mode Contract

Date: 2026-08-03

## Core Rule

Edit is the actual Preview render plus editor-owned overlays. It is not a
separate DOM reconstruction or a second CSS environment.

## Surface

- One persistent Roll20 iframe owns the rendered sheet.
- Preview/Edit mode changes do not replace the iframe document.
- Layer selection, drop targets, measurement, handles, and menus are editor
  affordances and never enter exported HTML/CSS.
- Rolltemplate source and scripts stay invisible on the sheet surface.

## Interaction

- Click selects a rendered layer.
- Ctrl/Cmd-click adds or removes a layer from structural selection.
- Flow mode uses before/inside/after and preserves document order.
- Free mode writes managed CSS relative to an explicit containing frame.
- Grouping requires contiguous siblings under one valid parent.
- Model, rendered DOM, emitted source, and re-import must agree after edits.
- Pointer feedback is immediate; authoritative source updates must not create a
  visible rollback.

## Styling

- Visual controls write managed CSS through a stable generated class.
- Authored CSS is preserved until the user explicitly changes that property.
- Presentation is not written into inline HTML.
- App UI CSS never enters the sheet iframe.

## Verification

Use `docs/ux/32_dom_layer_editing_plan.md` as the detailed current interaction
contract. The canonical browser smoke verifies the shared iframe, selection,
movement, grouping, flow/free insertion, width, result-card, and error paths.

Actual Roll20 parity remains a separate modern and legacy verification gate.
