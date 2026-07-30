# DOM Layer Editing Plan

Updated: 2026-07-19

This document defines how imported Roll20 DOM structures are represented in
the editor. It is a product contract for the layer panel and the shared iframe
edit surface, not a promise that every arbitrary HTML pattern is editable.

## Role Map

| DOM signal | Editor role | Can contain children | Default insertion | User-facing meaning |
| --- | --- | --- | --- | --- |
| `div`, `section`, `fieldset`, `form`, `group`, `container`, `wrapper` | Frame | Yes | Flow | A visual frame that can hold other layers |
| `row`, `col`, `grid`, `flex` | Flow | Yes | Flow | Children follow the container's layout order |
| `table`, `thead`, `tbody`, `tfoot`, `tr`, `td`, `th` | Table | Yes | Flow | A table structure whose order must be preserved |
| `input`, `select`, `textarea`, `checkbox`, `attr` | Input | No | Free | A form control that can be positioned as an object |
| `button`, `roll`, `action` | Button | No | Free | A clickable action or roll control |
| `text`, `label`, `heading`, `i18n` | Text | No | Free | Visible copy or translated text |
| `image`, `img`, `media` | Image | No | Free | A visual asset |
| `script`, `worker`, `rolltemplate` | Sheet action | No | None | Runtime code, kept out of the visual preview |
| `r20_element_container` | Frame | Yes | Flow | Safe custom element with an editable content slot |
| `r20_attribute_card` | Flow row | No | Flow | Composite cell group that moves as one unit inside its source row |
| `r20_skill_row` | Flow row | No | Flow | Composite `<tr>` that moves as one table row |

The classifier lives in `lib/editor/layerRoles.ts`. Each layer row exposes the
same semantic information through `data-r20-layer-role` and
`data-r20-can-drop`, so the visual layer panel and iframe drop overlay do not
invent separate DOM models.

## Drop Rules

1. `inside` is offered only for a role that can receive children.
2. `before` and `after` preserve sibling order in the same parent.
3. A flow or table container keeps the dropped child in document order; it
   must not silently become absolute-positioned.
4. Free placement inside a container is explicit. It records the container as
   the offset parent and writes generated layout CSS, while the HTML remains
   free of editor-only inline layout declarations.
5. A drop that would put an ancestor inside its descendant is rejected before
   Blockly is changed.
6. The iframe overlay and layer panel clear their target state after drop or
   pointer cancellation.

## Visual Language

- Frame: rose
- Flow: teal
- Table: amber
- Input: green
- Button: gold
- Text: pink
- Image: fuchsia
- Sheet action: slate

These colors describe editability and structure, not the imported sheet's
actual styling. They must never enter the Roll20 iframe stylesheet.

## Verification Boundary

Local tests cover classification, cycle protection, before/inside/after layer
operations, flow versus free placement, and selection synchronization. A
future browser acceptance test must additionally prove that the same imported
HTML surface is visible in preview and edit after a nested drop, with no
rollback frame and with the generated CSS output stable after re-import.

## Composite And Shadow Role Contract

The Shadow edit surface now receives the same role lookup used by the layer
panel. Imported DOM nodes therefore get `data-r20-layer-role` and
`data-r20-can-drop` from one classifier instead of relying on panel-only hints.
Table columns/column groups are table layers; value-switch panels and their
cases are frame layers; the generic element and helper composites expose their
content slots as frame layers; attribute-card and skill-row composites stay
reorderable in flow but do not accept arbitrary children. Composite blocks that
emit several DOM nodes remain one intentional layer when their internal parts
are exposed through the composite's own fields. A packed `r20_skill_row` is
treated as a table row by structural drop validation even though its visual
layer color remains Flow; this keeps a packed row insertable under `tbody` or
`thead` without making its generated cells arbitrary drop zones.

This describes the current local interaction contract. It does not claim that
every arbitrary runtime script or third-party markup pattern is decomposed into
individually editable layers.

## Semantic HTML Coverage

Standard semantic elements such as `main`, `header`, `section`, `article`,
`figure`, `details`, `form`, `p`, `pre`, `mark`, and `time` are represented by
the generic `r20_semantic_container` block. The tag allow-list is shared by
`lib/blocks/semanticTags.ts`, the HTML importer, and the HTML generator. This
keeps the element name, class, style, preserved attributes, and child order
editable without tying the mapping to a particular sheet.

This is structured import coverage, not a claim that every HTML element or
arbitrary JavaScript behavior is block-editable. Safe unknown elements use the
generic `r20_element_container` block; executable or document-level elements
such as `script`, `style`, `iframe`, and `template` remain behind the lossless
raw HTML boundary and remain visible in coverage warnings.
