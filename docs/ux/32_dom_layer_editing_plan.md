# 32. DOM Layer Editing Plan

Date: 2026-06-02

Goal: make edit mode feel like a visual editor while preserving actual Roll20 HTML/CSS behavior. Users should be able to drag objects directly, but when they drop into a structured container, the child should participate in that container's normal flow instead of always becoming absolute-positioned.

## Current Problem

| Area | Current behavior | UX problem | Product risk |
| --- | --- | --- | --- |
| Canvas drag | Existing DOM nodes are visually moved with `translate3d`, then committed as `position:absolute; left/top`. | Feels close to free canvas movement, but not like editing inside real layout containers. | Moving an input out of a row/frame can change preview vs edit behavior. |
| Widget drop | Gallery presets always get absolute positioning. | Dropping into a flex/table/section still creates a free-floating object. | Users cannot build normal Roll20 form rows by direct manipulation. |
| Layer panel | Lists Blockly blocks and can call nest/move operations. | It does not clearly communicate droppable frames or flow containers. | Users see a tree but do not understand where elements can safely go. |
| Frame highlighting | Layer icons use color, but the canvas itself does not show persistent container affordances. | A Figma-like "put this into that frame" action lacks visual confirmation. | Mis-drops create absolute layout clutter. |
| Data model | Visual DOM, Blockly tree, and widget helper presets are partially separate concepts. | User actions feel delayed or inconsistent when emit cache catches up. | Hard to claim edit screen equals preview screen. |

## DOM Role Classification

| DOM/block role | Examples | Default edit behavior | Drop behavior |
| --- | --- | --- | --- |
| Frame | `r20_div`, `r20_section`, `r20_fieldset`, group-like boxes | Highlight as blue container; can receive children. | Drop child into statement/children slot, remove absolute positioning unless user explicitly chooses free placement. |
| Flow row | `r20_row`, flex-like divs, table rows when supported by matcher | Highlight as cyan/teal ordered container. | Insert before/after nearest child; preserve flow order. |
| Table container | `table`, `tbody`, `tr`, `td`, `th` blocks | Highlight with table color and stricter insertion rules. | Only allow valid child types when importer/generator can represent them. |
| Absolute object | Images, labels, inputs, buttons with explicit `position:absolute` | Show orange/free-placement marker. | Drag updates left/top relative to nearest positioned containing block. |
| Inline/control object | text, input, button, checkbox, select | Normally participates in parent flow. | If dropped into frame/row, remove absolute positioning and nest; if dropped on canvas background, use absolute. |
| Non-canvas runtime | `script`, `script[type="text/worker"]`, `rolltemplate` | Hidden from canvas; represented in worker/chat workspaces later. | Not droppable as visible sheet elements. |

## Editing Rules

1. Canvas background drop creates an absolute object at sheet coordinates.
2. Container drop creates a flow child: nest the block under the container and strip `position`, `left`, and `top`.
3. Existing object drag inside the same structured container should reorder when dropped near siblings.
4. Existing object drag onto canvas background should become absolute.
5. If a user wants absolute positioning inside a frame, the frame becomes `position:relative` and the child gets left/top relative to that frame.
6. The layer panel and canvas must use the same container classification.
7. Script and rolltemplate nodes must stay hidden from the visual canvas and be exposed through worker/chat tooling, not as visible objects.

## First Implementation Slice

| Step | Files | Expected outcome |
| --- | --- | --- |
| Add shared layer role helpers | `lib/editor/layerRoles.ts` | One source of truth for frame/flow/table/free object classification and color labels. |
| Make friendly widget positioning optional | `lib/widgets/presets.ts` | Widgets can be created as absolute canvas objects or flow children. |
| Container-aware gallery drop | `components/editor/EditCanvas.tsx` | Dropping a widget over a frame-like DOM node nests the block and strips absolute style. |
| Canvas affordance CSS | `lib/preview/buildDoc.ts` or edit-only CSS injection | Frame-like nodes visibly show droppable outlines only in edit mode. |
| Report evidence | `docs/qa/31_active_todo.md` | Track what is implemented vs still TODO. |

## Verification

- Create or import a sheet with a section/row container.
- Drag a text input from the widget gallery onto the container.
- Confirm the new block is nested under the container in the layer panel.
- Confirm generated HTML puts the input inside the container.
- Confirm the input has no `position:absolute` when dropped into flow mode.
- Drag/drop on the sheet background and confirm absolute positioning still works.
- Compare edit canvas and preview after both actions.
