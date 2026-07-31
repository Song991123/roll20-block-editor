# DOM Layer Editing Plan

Updated: 2026-08-01

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
| `r20_list`, `r20_list_item` | Frame / Flow | Yes | Flow | List structure whose item order and child content remain editable |
| `r20_toggle_wrap`, `r20_toggle_on_area`, `r20_toggle_off_area` | Frame | Yes | Flow | Conditional view area controlled by a checkbox/state selector |
| `r20_inline_bold`, `r20_inline_italic` | Text | No | Free | Inline text styling that remains selectable as visible content |
| `r20_radio` | Input | No | Free | Radio control with a visible label |
| `r20_table_col`, `r20_table_caption` | Table atom | No | Flow | Atomic table metadata that can be reordered but cannot receive children |
| `r20_hr`, `r20_spacer`, `r20_inline_break` | Flow atom | No | Flow | Visible flow utility that can be reordered but cannot receive children |
| `r20_icon` | Image | No | Free | CSS-backed icon glyph that remains selectable as a visual layer |
| `r20_on_*`, `r20_worker_*` | Sheet action | No | None | Worker event/code, preserved outside the visual sheet |
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
4. A list container accepts only list-item blocks as direct children; a list
   item may contain ordinary content or a nested list, but not another direct
   list item.
5. Free placement inside a container is explicit. It records the container as
   the offset parent and writes generated layout CSS, while the HTML remains
   free of editor-only inline layout declarations.
6. A drop that would put an ancestor inside its descendant is rejected before
   Blockly is changed.
7. The iframe overlay and layer panel clear their target state after drop or
   pointer cancellation.
8. Ctrl/Cmd-click may select multiple layers in the panel. Grouping is
   available only when the selection contains contiguous siblings under one
   parent; it creates a normal editable `r20_element_container` (`<div>`) and
   preserves the selected order.
9. Grouping rejects mixed parents, non-contiguous selections, and invalid
   table/conditional insertion points. The rejected action must leave the
   Blockly graph and rendered iframe unchanged.
10. The persistent iframe is the canonical edit surface. Additive layer
    selection is sent as a list to that iframe, so every selected object is
    highlighted on the same rendered sheet while the primary selection alone
    drives measurement and inspector focus.
11. A plain click on the rendered sheet selects one layer. Ctrl/Cmd-click adds
    the clicked layer to the transient selection list and makes it primary;
    the list is shared with the layer panel before any grouping or structural
    operation.
12. In free placement, dragging a multi-selection applies one pointer delta to
    every selected top-level layer without reparenting it. Pointer-up must use
    the stable rendered selection IDs when iframe messages arrive out of order,
    then commit each layer's managed position back to its existing parent.

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

Exact insertion feedback is separate from role color: `before` and `after`
paint a thin teal edge line at the target's corresponding boundary, while
`inside` paints a rose frame around the candidate container. The same mode
label and distinction are used by the parent-owned iframe overlay and the
layer-panel row. A candidate container is therefore not presented as an
already-selected insertion position.

## Visual Style Editing Contract

- A visual HTML layer with a root class field exposes plain controls for size,
  padding, fill, text color, border, corner radius, child layout, gap, and
  typography. Runtime-only layers remain outside this inspector.
- User changes are written to the CSS workspace under the block's stable
  `sheet-r20-node-*` class. New visual edits must not add presentation
  declarations to the emitted HTML `style` attribute.
- A touched property is removed from both the block's ordinary style field and
  its preserved imported `style` backup. Unrelated inline declarations,
  `data-*`, ARIA, and other preserved attributes remain intact.
- Managed presentation declarations merge with managed position declarations.
  Moving a styled object must not erase its fill, spacing, border, or type
  rules; styling a moved object must not erase `position`, `left`, or `top`.
- Friendly gallery defaults use the same managed CSS path. The gallery now
  includes an anonymous generic Roll button whose preview click produces the
  built-in default Roll20 template card.
- This closes section/button styling and Roll-button creation locally. It does
  not yet make `<rolltemplate>` itself a dedicated visual composition surface;
  that remains the next editor task.

## Verification Boundary

Local tests cover classification, cycle protection, before/inside/after layer
operations, flow versus free placement, grouping preconditions, selection
synchronization, and multi-object free transform. The browser smoke also
proves Ctrl selection -> iframe multi-highlight -> shared free movement ->
persisted emitted positions, while grouping keeps the model parent, iframe
parent, and emitted HTML aligned. A future browser acceptance test must additionally prove that
the same imported HTML surface is visible in preview and edit after a nested
drop, with no rollback frame and with the generated CSS output stable after
re-import.

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
The packed `r20_attribute_card` is instead a `cell_group`: it may reorder
within its source `tr`, but cannot be inserted directly under `table` or
`tbody` because it emits sibling cells without a wrapper.

Display atoms such as a horizontal rule, spacer, or line break use the Flow
role for ordering and color, but explicitly set `data-r20-can-drop="0"`.
This keeps the layer panel honest: the user can move the visible utility in
the authored flow without seeing an invalid inside drop target. The icon block
uses the Image role because its glyph is supplied by sheet CSS and is a leaf
visual object. Translation dictionary entries remain export-only source blocks
and are not presented as visual DOM layers.

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

## Classability Audit Decisions

The layer editor must preserve authored classes on visual composites without
turning non-visual syntax into selectable sheet layers. The current decisions
are:

| Block | Visual layer | CLASS policy | Reason |
| --- | --- | --- | --- |
| `r20_value_switch_panel` | frame | wrapper `CLASS` is imported and emitted | The wrapper is a real drop-capable DOM frame. |
| `r20_value_case` | frame | panel `CLASS` is imported and emitted | Each case is a selectable visual panel under the switch. |
| `r20_radio_group` | frame | optional wrapper `CLASS` is emitted | It is a manual composite; imported fieldsets remain generic when their structure is not losslessly recognizable. |
| `r20_dual_roll_button` | action composite | row and both button classes are optional | The composite emits three visual styling surfaces, so one class field would be ambiguous. |
| `r20_toggle_checkbox` | control | input and label classes are separate | The checkbox and its label are sibling visual controls with different hit/typography styling. |
| `r20_toggle_on_area` / `r20_toggle_off_area` | frame | wrapper `CLASS` is optional | The generated state-selector classes remain fixed; authored classes extend the area without changing the CSS state contract. |
| `r20_text_node` | text-like semantic node | no `CLASS` | It represents direct text and adding a wrapper would change inline HTML semantics. |
| `r20_template_invoke` | runtime | no visual layer | It emits a chat template command, not sheet DOM. |
| worker/reporter/i18n syntax | runtime/export-only | no visual `CLASS` | These blocks configure behavior or translation rather than a visible element. |

For class-bearing composites, import strips only the generated structural
tokens and stores the remaining class tokens in the user-facing `CLASS`
field. The generator reattaches the `sheet-` prefix once, so a normal
import/export round trip does not double-prefix or silently drop the authored
selector. This is a local mapping contract; arbitrary composite internals and
third-party runtime markup remain subject to the coverage report until a
fixture proves a lossless matcher.
