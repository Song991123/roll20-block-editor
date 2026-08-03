# DOM Layer Editing Plan

Updated: 2026-08-03

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
| `r20_generic_input` | Input | No | Free | A native range/date/color or other input that remains one leaf object |
| `r20_element_atom` | Other | No | Free | A safe HTML void element that remains one leaf object |
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

## Layer Panel Navigation

- The layer panel width is a saved browser preference between 220 and 440
  pixels. A native pointer separator changes it without rebuilding the sheet
  iframe; Left/Right and Shift plus Left/Right offer keyboard adjustment, and
  a double click restores the 248-pixel default.
- One shared responsive track expression positions the layer panel, the
  persistent Preview/Edit iframe, and the inactive canvas slot. A narrower app
  viewport may temporarily constrain the saved preference while leaving at
  least 280 pixels for the sheet surface.
- Separator key events stop at the separator. They must not trigger the
  selected-layer keyboard movement contract below.
- The virtualized layer list exposes `tree` / `treeitem` semantics and one
  roving tab stop. Tab selects and focuses the next visible layer; Shift plus
  Tab returns to the previous layer. Moving past the rendered window scrolls
  and mounts the target before focus, without changing emitted HTML or CSS.
- Selecting a row uses automatic visibility alignment. A row already inside
  the viewport stays in place instead of jumping to the panel center.

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
13. A virtualized layer list scrolls while a layer stays near its upper or
    lower edge. Drop, drag end, and panel exit stop the scroll, and parent-level
    cleanup clears drag identity even when virtualization unmounts the source
    row.
14. A valid `inside` hover over a collapsed container opens it after a short
    deliberate pause. Opening the panel row is preview-only navigation; the
    Blockly graph and emitted HTML change only after an accepted drop.
15. Structural layer selection and friendly-widget selection use separate
    iframe markers. Updating or clearing one selection channel must not erase
    the other channel's visible state.
16. A multi-selection exposes six alignment actions only when every selected
    visual layer is absolutely positioned, shares one logical parent, and uses
    that same parent as its rendered offset parent. Alignment uses the measured
    selection bounds, preserves HTML order and parentage, and commits position
    through managed CSS. Three or more eligible layers also expose horizontal
    and vertical distribution. Distribution preserves the outer selection
    bounds and makes the gaps between rendered boxes equal. Flow, table, list,
    mixed-parent, and mixed-coordinate selections do not receive these actions.
17. Arrow keys move an eligible absolute selection by one pixel; Shift plus an
    arrow moves it by ten pixels. The logical parent and rendered offset parent
    must already agree. The iframe paints the new coordinates before the model
    round trip, then the existing managed-CSS position path becomes
    authoritative. Flow/table/list content is never converted to absolute
    positioning by a keyboard action.
18. Pointer coordinates are viewport pixels, while managed `left` and `top`
    values are local CSS pixels. The iframe bridge records an accumulated 2D
    local-to-viewport matrix for common `transform` and CSS zoom chains; the
    drop resolver inverts it before snapping. During the drag, the same inverse
    keeps the optimistic element under the top-level pointer without replacing
    its authored transform. Scale-only geometry remains a compatibility
    fallback. The move keeps its logical parent and offset parent, emits owned
    CSS, and must not jump after model commit or a Preview/Edit switch.
19. Every HTML void element remains a leaf in both the layer panel and iframe
    overlay. In particular, an uncommon native `<input>`, `<source>`, or `<wbr>`
    cannot expose an `inside` target because emitted HTML has no child slot.

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
- A single eligible visual selection exposes direct resize handles on the
  parent-owned iframe overlay. Dragging applies a temporary size only to the
  live iframe element; pointer-up commits touched dimensions once through the
  same managed CSS rule and clears the temporary inline values. Absolute
  layers may resize from every edge and corner, while flow layers keep their
  leading position and resize from the trailing edges. Ordinary inline text and
  table-row structures remain inspector-only because a box handle would
  misrepresent their authored layout semantics; inline images retain box
  handles because their rendered dimensions are explicit design data.
- A touched property is removed from both the block's ordinary style field and
  its preserved imported `style` backup. Unrelated inline declarations,
  `data-*`, ARIA, and other preserved attributes remain intact.
- Eligible absolute multi-selections show one dashed selection frame and six
  compact icon controls for left, horizontal center, right, top, vertical
  center, and bottom alignment. A selection of three or more adds horizontal
  and vertical gap controls. The frame is parent-owned UI above the same
  persistent iframe; it never enters emitted HTML or sheet CSS.
- Managed presentation declarations merge with managed position declarations.
  Moving a styled object must not erase its fill, spacing, border, or type
  rules; styling a moved object must not erase `position`, `left`, or `top`.
- Friendly gallery defaults use the same managed CSS path. The gallery now
  includes an anonymous generic Roll button whose preview click produces the
  built-in default Roll20 template card.
- The direct inspector provides 35 generic one-click starting styles: four
  section styles, four button styles, three text styles, four input styles,
  four table-surface styles, four table-row styles, four table-cell styles,
  four result-card styles, and four result-row styles. These are authored
  product presets, not copied sheet designs or bundled community examples.
- A sheet frame/flow selection presents the four section choices as
  coordinated whole-section themes. Applying one is explicit: it paints the
  selected root plus a confident heading or semantic title/eyebrow no deeper
  than two layer levels. Discovery stops at a nested classed section, panel,
  card, box, group, or frame boundary. Generic body text, field labels, inputs,
  and deeper headings remain outside the theme target set.
- An eligible frame/flow selection with children also presents four explicit
  inside-layout choices: vertical stack, horizontal wrap, equal two columns,
  and a 2:1 sidebar. Layout changes affect the selected root plus confident
  direct title/eyebrow children only; the HTML child sequence is never
  reordered. Childless roots, ordinary input/action groups, and Rolltemplate
  trees do not receive this gallery.
- A layout switch clears only the managed flex/grid properties owned by the
  layout recipe. Existing color, typography, border, background, and unrelated
  imported declarations stay intact. The resulting flow must be measured in
  the same persistent iframe in both Edit and Preview.
- Sections eligible for both contracts present four complete designs before
  separate controls. Each complete design pairs one original section theme
  with one structure-aware layout and applies both in a single managed-CSS
  batch. It must never insert a wrapper, clone a child, or reorder source HTML.
- Separate color and layout galleries remain available under a collapsed
  user-facing fine-tune control. This is progressive disclosure only; it does
  not remove granular authoring or silently apply a default to imported sheets.
- New section boxes seed their root from the same paper-theme definition used
  by later theme changes. Creation and editing therefore do not maintain
  separate palettes, and both paths still emit managed CSS rather than inline
  presentation.
- A row or semantic field/control wrapper with a direct ordinary input or
  action uses a more specific `한 줄 전체 모양` gallery. Its four themes
  coordinate the selected root, semantic label, ordinary input, and action/Roll
  button. This replaces, rather than stacks with, the broader section gallery
  for that selection.
- Whole-row target discovery accepts direct children and one shallow
  label/control wrapper only. It does not descend into a nested row and does not
  paint hidden, checkbox, radio, toggle, or file controls as text inputs. Roll
  commands and Roll20's d20 pseudo-element content/font remain outside the
  theme declarations.
- A direct Roll-button selection uses a whole-button design gallery in its
  base state. Each design owns base, hover, active, focus, and d20 icon paint;
  it never changes the Roll command, icon content, or `dicefontd20` family.
- Whole-button design application clears stale state-only visual declarations
  before writing the selected design. State tabs and icon controls then remain
  available as deliberate per-state overrides.
- Buttons and ordinary input controls expose base, hover, active, and focus
  appearance states. State rules use the same stable managed class with CSS
  pseudo-classes. If a touched property came from an imported inline style,
  its base value moves to managed CSS before the state rule is added, so the
  normal appearance does not disappear and no `!important` is required.
- Table roots, row groups/rows, and cells receive separate preset groups. The
  editor styles the selected semantic table node directly and does not wrap it
  in a layout-changing helper element.
- Frame and flow layers expose a visual background-image editor in their base
  state. It accepts remote HTTP(S) URLs, provides image fit, repeat, and a 3x3
  position control, and writes `background-image`, `background-size`,
  `background-position`, and `background-repeat` through the same managed CSS
  rule as the rest of the inspector.
- Frame and flow layers also expose a visual quick-decoration panel. It offers
  no/left/top/right/bottom accent placement, four authored color swatches plus
  a custom color, three line widths, four shadow treatments, three corner
  treatments, and three inner-spacing choices. These controls write ordinary
  border longhands, `box-shadow`, `border-radius`, and `padding` to the same
  stable managed class without inserting a wrapper or changing DOM order.
- New background URLs reject relative, `data:`, executable, credential-bearing,
  and multiline values. HTTP remains editable for imported compatibility but
  shows a visible Roll20 warning. A newly added URL starts at cover, centered,
  and no-repeat; an existing authored size/position/repeat is preserved.
- Imported gradients, multiple backgrounds, and other complex declarations are
  not flattened into the URL control. They remain in CSS until the user
  explicitly replaces or clears the background. External assets remain subject
  to the export asset preflight and are never embedded or published by this UI.
- Direct Roll buttons expose a visual editor for Roll20's built-in d20 icon.
  Users can choose a clear, large, soft, or hidden starting style and adjust
  size, text gap, opacity, and color. The editor changes only the button's
  `::before` presentation; Roll20 remains the source of the icon content and
  `dicefontd20` font family.
- Direct heading, label, static-text, and translated-text blocks expose a
  visual title/label editor in their base state. Users can choose plain,
  underline, side-line, band, or tag treatment, four authored palettes or a
  custom color, three alignments, three sizes, and four weights. The source tag
  and text stay unchanged; presentation is moved to the same stable managed
  class used by the detailed inspector.
- Runtime text markers and unwrapped text-node emitters do not receive these
  controls. A layer must own a selectable emitted element before the editor
  offers element-level title/label decoration.
- Direct `r20_image` blocks expose image fit, 3x3 focal position, opacity, and
  corner controls. The panel edits only ordinary image presentation through
  the stable managed class; source URL, alternative text, dimensions, and DOM
  position remain unchanged. CSS-backed `r20_icon` glyphs are excluded because
  they do not emit an `<img>` element.
- Managed presentation rules can target the selected element, `::before`, or
  `::after`. Pseudo-element edits never strip the selected element's inline
  declarations. State selectors keep CSS order as pseudo-class then
  pseudo-element so future state-specific icon styling remains valid.
- Managed rules repeat the stable node class to outrank Roll20's baseline
  control selectors without `!important`. The editor selection overlay uses an
  outline only and must not change the selected element's corner radius.
- This closes basic section/button/text/input/table styling, interactive
  control states, and Roll-button creation locally. It does not claim a
  complete design system for every custom sheet.

## Rolltemplate Visual Surface

- `굴림 결과` uses a dedicated card surface backed by the same
  `RolltemplateRenderSurface` and emitted HTML/CSS/translation as the roll
  history. It no longer resizes the persistent character-sheet iframe.
- The layer panel is scoped to one active `<rolltemplate>` tree. The template
  root, rows, conditions, and visible text/content blocks keep their source
  block IDs, so card click, layer selection, and the direct inspector share one
  selection state.
- Template additions are flow-only. The friendly gallery exposes anonymous
  row, title, label, value, and image pieces only where the selected template
  container can receive them; it does not introduce absolute positioning into
  chat cards.
- Presentation changes use the same stable managed CSS class contract as sheet
  layers. Browser smoke proves that a changed template-row fill and a dropped
  label appear both in the editor card and in the existing chat result without
  adding presentation inline HTML.
- A template child's managed rule starts with its owning
  `.sheet-rolltemplate-NAME` selector. This keeps the rule outside Roll20's
  `.charsheet` prefix and lets the same CSS reach the actual chat card. Normal
  sheet layers continue to use sheet-scoped selectors.
- The template root itself is editable even though Roll20 does not expose a
  separate author class for it. Managed root presentation targets the emitted
  `.sheet-rolltemplate-NAME` class directly. A newly created template starts
  with one coordinated generic paper theme and a readable result row; no
  third-party sheet design is bundled.
- Root selection exposes coordinated whole-card themes. A theme applies only
  after an explicit user action and writes concrete managed CSS to the root,
  generic headings, result rows, the first structural label in each row, and
  semantic or bold result values. Target discovery follows the imported block
  tree; unclassified body copy is preserved instead of guessed. New anonymous
  cards use the same theme definitions, so creation and later theme changes do
  not maintain separate palettes.
- Changing a template `NAME` through either inspector or the Blockly field
  migrates every managed descendant rule to the new
  `.sheet-rolltemplate-NAME` scope and migrates the managed root rule itself.
  The old root or descendant scope must not remain after the
  rename, and changing the name back must restore the original chat linkage.
- Length controls preserve authored units such as `%`, `rem`, and multi-value
  spacing. A bare number is normalized to `px` only when the user commits it.
- This is an implementation and local synthetic-browser result. It does not
  prove that every third-party template helper or actual modern/legacy Roll20
  chat renderer is visually identical.

## Unified Editor History

- The edit toolbar reads one chronological history across HTML, CSS,
  translation, Page JS, and Worker workspaces instead of assuming every visual
  action belongs to HTML.
- A managed visual change uses one Blockly event group for its HTML class hook,
  removed inline declarations, managed CSS rule, and any selected siblings.
  One user movement therefore requires one undo even when several blocks and
  both HTML/CSS workspaces changed.
- Undo records the exact affected workspace group. Redo follows the order in
  which the user undid actions, rather than incorrectly sorting by the actions'
  original timestamps. A new recorded mutation invalidates that shared redo
  branch.
- Full paint readiness and structural readiness are distinct. A CSS-only patch
  keeps keyboard editing available because the iframe DOM is still current;
  an unapplied HTML tree pauses keyboard movement until its apply ACK arrives.
- Current browser proof covers two grouped three-layer keyboard moves followed
  by two undos and two redos, plus one-step roundtrips for flow reparenting,
  direct image resize, and a coordinated section theme. Multi-target section,
  control, result-card, Roll-button, layout, and composition presets use one
  outer event group so one visible command remains one history action.
- The same browser path covers layer-panel pointer resize, keyboard resize,
  local preference persistence, default reset, and exact agreement between the
  panel edge, iframe origin, and inactive canvas-slot origin.
- A long virtualized list also covers forward and reverse Tab navigation,
  unique sequential focus, automatic edge scrolling, active-row visibility,
  one roving tab stop, and an unchanged HTML/CSS emit.
- Longer mixed-operation runs on dense imported structures and actual Roll20
  interaction remain outside this local synthetic proof.

## Verification Boundary

Local tests cover classification, cycle protection, before/inside/after layer
operations, flow versus free placement, grouping preconditions, selection
synchronization, multi-object free transform, keyboard nudging, six-way
alignment math, and horizontal/vertical equal-gap distribution. The browser
smoke also proves scaled and rotate/skew/scale nested free moves -> owned CSS ->
Preview/Edit geometry equality without authored-transform loss, then Ctrl selection -> iframe multi-highlight ->
layer-panel third selection -> shared free movement -> iframe and layer-panel keyboard nudges ->
two-step undo/redo -> flow reparent undo/redo -> direct resize undo/redo ->
coordinated theme undo/redo -> Preview/Edit equality -> same-parent vertical
distribution -> top alignment -> persisted managed CSS. Distribution keeps the outer rendered
bounds, while alignment and nudging keep position out of inline HTML. Grouping
keeps the model parent, iframe parent, and emitted HTML aligned.
Anonymous imported cross-container cases prove existing content can move
between frames, lists, table bodies, and value-switch cases, keep the same
target parent in Edit and Preview, and retain that nesting after emit ->
re-import -> emit. A value-switch case panel owns the internal marker for its
case block, and the parent switch preserves an imported checked radio as its
editable initial value. Protected real-fixture and actual modern/legacy Roll20
coverage remain future acceptance work.

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
