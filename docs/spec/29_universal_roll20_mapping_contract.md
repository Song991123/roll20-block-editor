# 29. Universal Roll20 Mapping Contract

Date: 2026-05-19

This is the contract for the editor. The goal is not "make YSHY look okay." YSHY is only one high-pressure fixture. The product must import, represent, edit, preview, and export arbitrary Roll20 custom sheets and official sheet patterns without silently losing semantics.

## Product Requirement

The editor must support:

1. HTML, CSS, i18n/translation, sheet worker JS, and rolltemplate content.
2. A block representation for every meaningful source node or rule.
3. A user-friendly layout/editor layer that can manipulate those blocks like design objects.
4. A Roll20-like preview environment that matches the actual Roll20 character sheet sandbox as closely as measurable.
5. Legacy sandbox sanitization as an explicit on/off export setting, never as an implicit mutation.

## Non-Negotiable Pass Criteria

An import/export pass is not "matched enough." It is one of these:

| Level | Meaning | Allowed Claim |
|---|---|---|
| L0 | Import did not crash, blocks were created. | "Imported, not validated." |
| L1 | Structure match: DOM/CSS/worker/i18n nodes mapped to blocks with no unexplained drops. | "Structurally mapped." |
| L2 | Semantic roundtrip: import -> emit -> import preserves block types, hierarchy, attrs, CSS rules, workers, rolltemplates, and i18n. | "Semantically roundtrip-safe." |
| L3 | Byte-identical or documented normalized diff: source and emitted output match after only explicitly allowed normalization. | "Roundtrip verified." |
| L4 | Visual parity: local preview matches Roll20 sandbox screenshot within accepted diff bounds. | "Roll20 visual verified." |

The project may only say "100%" for the exact level and corpus that passed. For example: "YSHY 1부 L1 passed, L3 failed on expression parsing" is acceptable. "Import 100%" without a report is forbidden.

## Source to Block Mapping

Every source artifact must become blocks, not opaque app-only state.

| Source | Required Block Representation |
|---|---|
| HTML element | Element block with tag, attributes, children, text nodes, stable block id, and editable user-facing label. |
| HTML text node | Text/static content block or text field on a parent block when lossless. Mixed inline text must preserve order. |
| HTML comment | Comment block or explicitly documented ignored artifact. Roll20/i18n comments must not be dropped. |
| `style=""` attr | Preserved as source style unless it was created by the design editor. Imported inline style is source fidelity, not layout-editor output. |
| `class=""` attr | Token-preserving class field. Never collapse multi-class strings. |
| CSS rule | CSS selector block with declaration child blocks or raw CSS fallback with parser diagnostics. |
| CSS at-rule | At-rule block or raw CSS fallback. `@media`, `@keyframes`, `@import`, and Roll20-unsafe rules must be represented before sanitization. |
| Rolltemplate | Hidden from sheet canvas preview, represented as rolltemplate blocks, rendered in chat simulation when a roll invokes it. |
| Sheet worker JS | Hidden from sheet canvas preview, represented as worker/event blocks or raw worker blocks, executed in the preview sandbox simulator when supported. |
| Translation file | i18n key/value blocks or translation table. The preview must apply translations before visual comparison. |
| Roll button value | Expression tree when parseable. Raw expression fallback only with explicit diagnostics. |

## Worker JS Editing Contract

Sheet worker JavaScript is a first-class source artifact, not text that should appear in the sheet canvas. The current importer may preserve unsupported JS as `r20_raw_worker`, but the product direction is a separate worker workspace that can gradually become block-editable.

Required behavior:

- `<script type="text/worker">` is imported into the worker layer and hidden from visual sheet preview.
- Recognized Roll20 APIs such as `on(...)`, `getAttrs(...)`, `setAttrs(...)`, `getSectionIDs(...)`, `getTranslationByKey(...)`, and repeating-section helpers should become worker blocks when parseable.
- Unsupported statements remain as raw worker blocks with exact source text and diagnostics.
- Raw worker blocks must roundtrip without being lost. They are allowed while coverage grows.
- Preview execution and chat rendering must consume the worker layer, not visible HTML text.
- Future user-facing JS block coding should operate on this worker workspace without changing the HTML/CSS block model.

Untyped script compatibility:

- `type="text/worker"` is the authoritative worker marker.
- For older sheets that omit the marker, a script is moved to the worker
  workspace only when its source visibly calls a Roll20 worker API such as
  `on`, `getAttrs`, `setAttrs`, `getSectionIDs`, translation helpers, or
  compendium helpers.
- An ordinary untyped page script remains an HTML raw block and is hidden by
  the preview runtime. It must not be silently converted into a worker or
  dropped from export. A future JS workspace can replace this raw fallback
  without changing the HTML/CSS mapping contract.

## Design Editor vs Source Fidelity

Do not mix these two concerns:

### Source Fidelity

When importing an existing sheet, preserve what the author wrote. Inline style, table wrappers, hidden checkboxes, `:checked` controls, and odd Roll20-specific structures are evidence. Do not "clean" them unless a user explicitly asks for transformation.

### Design Editor Output

When the user edits layout in the visual editor, newly created layout data should be class-tracked and emitted through CSS whenever possible:

```html
<input class="sheet-name-input sheet-r20-node-abc123" name="attr_name">
```

```css
.sheet-r20-node-abc123 {
  position: absolute;
  left: 128px;
  top: 64px;
}
```

This keeps exported HTML readable and keeps layout changes separate from imported source style. Imported inline styles remain inline unless the user runs an explicit "extract inline styles to CSS" transformation.

## Frames, Groups, and Containing Blocks

The visual editor must behave like a design tool while preserving HTML semantics.

1. A frame/group is a real HTML container block.
2. Moving an object inside a frame changes coordinates relative to that frame's containing block.
3. If a child is positioned absolute inside a frame, the frame must have `position: relative` in CSS or equivalent source style.
4. Reparenting is a structural edit. It must update the block tree, not only visual coordinates.
5. If an object overlaps in edit mode, it must overlap in preview mode. Edit and preview must consume the same emitted HTML/CSS, with only non-layout edit overlays added.

## Default View and Era Controls

Roll20 sheets often show only one default era/view until a checkbox, radio, or hidden attr changes. Examples include CoC 7th and YSHY references to `1920`, `pulp`, and era skill lists.

Required model:

- Hidden input/radio/checkbox controls must be imported.
- CSS sibling selectors such as `:checked ~ .sheet-section` must be preserved.
- Sheet worker initialization that sets default attrs must be simulated when possible.
- Preview must expose a user-facing state panel for defaults without hardcoding YSHY or CoC names.
- "Legacy sanitization" must not erase default-view behavior unless the export report explicitly says what changed.

## Legacy Sanitization

Legacy Roll20 sanitization must be an explicit toggle:

| Mode | Behavior |
|---|---|
| Off | Preserve source HTML/CSS/worker output as authored, except for app-internal preview-only attributes removed during export. |
| On | Apply documented Roll20 legacy-safe transformations and emit a warnings report. |

The toggle is a per-export/per-preview setting. It must not mutate source workspaces silently.

## Roll20 Preview Contract

The local preview must isolate app CSS from sheet CSS.

Required:

- Shadow DOM or iframe isolation.
- Roll20 baseline CSS loaded before user CSS.
- User CSS loaded last.
- App UI CSS must not cascade into `.charsheet`.
- `script[type="text/worker"]`, normal `script`, and `rolltemplate` must not be visibly rendered in the sheet canvas.
- Sheet workers and rolltemplates are simulated through the preview runtime/chat pane, not by displaying their source text.

## Chat and Rolltemplate Contract

Roll buttons must flow through the same path a Roll20 user expects:

1. User clicks a roll button in preview.
2. Preview collects current `attr_*` values.
3. Sheet worker state is consulted when available.
4. Roll expression is evaluated or stubbed with a clear unsupported marker.
5. Matching `<rolltemplate class="sheet-rolltemplate-NAME">` is rendered in the chat pane.
6. Chat pane CSS should approximate Roll20's default chat width and message styling.

## User-Friendly Block Layer

The app has two audiences:

- Technical users who can edit blocks, attributes, expressions, CSS, and workers.
- Non-technical sheet makers who need a Figma-like canvas.

Therefore every technical block should have:

- A natural Korean display name.
- A plain-language inspector label.
- A visible design object when it affects layout.
- A safe raw fallback when the system cannot parse it yet.
- A diagnostic state when the block is lossy, unsupported, or raw.

## Forbidden Shortcuts

- YSHY-specific parser branches.
- CoC-specific or Pulp-specific hardcoding outside named fixtures/tests.
- Reporting aggregate PASS when a subset failed.
- Hiding raw unsupported content without representing it as a block.
- Treating visual preview as verified without Roll20 sandbox or screenshot evidence.
- Writing into source corpus folders.
