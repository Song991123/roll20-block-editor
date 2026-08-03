# 29. Universal Roll20 Mapping Contract

Date: 2026-05-19

This is the contract for the editor. The product must import, represent, edit,
preview, and export arbitrary Roll20 custom sheets without silently losing
semantics or adding source-specific branches.

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

The project may only report the exact level proven by current local evidence.
Tracked status uses generic pass/partial/fail language; source-specific corpus
identity and measurements stay local and ignored. "Import 100%" without full
scope proof is forbidden.

## Source to Block Mapping

Every source artifact must become blocks, not opaque app-only state.

| Source | Required Block Representation |
|---|---|
| HTML element | Element block with tag, attributes, children, text nodes, stable block id, and editable user-facing label. |
| HTML text node | Text/static content block or text field on a parent block when lossless. Mixed inline text must preserve order. |
| HTML comment | Comment block or explicitly documented ignored artifact. Roll20/i18n comments must not be dropped. |
| `style=""` attr | Preserved as source style unless it was created by the design editor. Imported inline style is source fidelity, not layout-editor output. |
| `class=""` attr | Token-preserving class field. Never collapse multi-class strings. |
| Other native `<input>` types | Range, date, color, email, search, and future browser-native input types map to an editable control leaf with type/name/value/range/state fields. A void input must never advertise an inside drop. |
| Other HTML void elements | Safe void tags without a dedicated block map to `r20_element_atom`. They preserve tag/class/style and safe unknown attributes but never own children or expose an inside drop target. |
| `select` / `optgroup` / `option` | Preserve direct and grouped option order as nested editable blocks. Group labels and disabled state, option values and selected state, and safe unknown attributes must survive import and emit. |
| CSS rule | CSS selector block with declaration child blocks or raw CSS fallback with parser diagnostics. |
| CSS declaration value | Remove only top-level declaration boundaries. Semicolons inside quoted strings and functions such as `url("data:...;base64,...")` are source data and must survive import and emit. |
| CSS at-rule | At-rule block or raw CSS fallback. `@media`, `@keyframes`, `@import`, common block at-rules such as `@supports`, `@container`, and `@layer`, and Roll20-unsafe rules must be represented before sanitization. Safe nested block at-rules use the editable `r20_css_at_rule` container; malformed or semicolon-only forms stay lossless raw CSS. |
| Rolltemplate | Hidden from sheet canvas preview, represented as rolltemplate blocks, rendered in chat simulation when a roll invokes it. Direct text/Mustache tokens between child elements must remain ordered and lossless; they may not be dropped just because they are not elements. |
| Sheet worker JS | Hidden from sheet canvas preview, represented as worker/event blocks or raw worker blocks, executed in the preview sandbox simulator when supported. |
| Translation file | i18n key/value blocks or translation table. The preview must apply translations before visual comparison. Locale metadata must accept the user's valid BCP-47-like tag; do not limit custom sheets to a fixed language list. Roll20 export remains a flat `translation.json` string map. |
| Roll button value | Expression tree when parseable. Raw expression fallback only with explicit diagnostics. |
| Form default state | `checked` radio/checkbox and `selected` option state must be editable block fields and must survive emit; preserved-attribute metadata remains a fallback for attributes without a dedicated field. |

## Worker JS Editing Contract

Sheet worker JavaScript is a first-class source artifact, not text that should appear in the sheet canvas. It has a separate Worker workspace; the importer preserves statements that are not yet structurally mapped as `r20_raw_worker` while block coverage grows.

Required behavior:

- `<script type="text/worker">` is imported into the worker layer and hidden from visual sheet preview.
- Recognized Roll20 APIs such as `on(...)`, `getAttrs(...)`, `setAttrs(...)`, `getSectionIDs(...)`, `getTranslationByKey(...)`, `getTranslationLanguage()`, and repeating-section helpers should become worker blocks when parseable.
- Unsupported statements remain as raw worker blocks with exact source text and diagnostics.
- Raw worker blocks must roundtrip without being lost. They are allowed while coverage grows.
- Preview execution and chat rendering must consume the worker layer, not visible HTML text.
- User-facing JS block coding grows inside this Worker workspace without changing the HTML/CSS block model.
- The preview simulator follows Roll20's documented `eventInfo` change fields:
  lowercase `sourceAttribute`, `sourceType`, `previousValue`, and `newValue`.
- `setAttrs(values, { silent: true }, callback)` must suppress dependent change
  events without suppressing its completion callback. See the official
  [Roll20 Sheet Worker API](https://help.roll20.net/hc/en-us/articles/360037773513-Sheet-Worker-Scripts).

Repeating-section runtime contract:

- A source `fieldset.repeating_*` remains the hidden row template. Runtime rows
  live in sibling `repcontainer[data-groupname]` and
  `repcontrol[data-groupname]` nodes; each row is a
  `repitem[data-reprowid]`. This structure follows Roll20's documented
  [sheet-development contract](https://help.roll20.net/hc/en-us/articles/360037773413-Intro-to-Sheet-Development).
- Adding a row clones the template and rewrites `attr_`, `roll_`, and `act_`
  names with the repeating group and row ID. The source template itself must
  not be read as a live character attribute.
- Every repeating section name must be unique, and the name after
  `repeating_` must not contain another underscore. Import preserves an invalid
  duplicate or underscored section so the user can repair it, but reports a
  blocking error and export must not produce an upload payload until it is
  fixed.
- `setAttrs` with a full repeating attribute may create a missing row.
  `generateRowID`, `getSectionIDs`, and `removeRepeatingRow` operate on the same
  runtime row set.
- While a repeating change or removal handler runs, the documented
  `repeating_group_field` shorthand resolves to the triggering row for both
  `getAttrs` and `setAttrs`.
- A repeating field update dispatches its full attribute event, the
  `change:repeating_group:field` alias, the `change:repeating_group` alias, and
  the plain field plus `_max` aliases. Removal includes the full lowercased
  source attribute and `removedInfo`, and may be observed by section or row ID.
- Reordering a valid section persists `_reporder_repeating_group` and dispatches
  `change:_reporder:group`. The local simulator stores the complete current
  display order. Browser proof covers the local contract; actual Roll20 upload
  proof remains a separate gate.

Untyped script compatibility:

- `type="text/worker"` is the authoritative worker marker.
- For older sheets that omit the marker, a script is moved to the worker
  workspace only when its source visibly calls a Roll20 worker API such as
  `on`, `getAttrs`, `setAttrs`, `getSectionIDs`, translation helpers, or
  compendium helpers.
- An ordinary untyped page script moves to the separate inert JS workspace and
  keeps its authored source-order slot. It is never silently converted into a
  Worker and never executes in Preview/Edit or Roll20.

Script MIME boundary:

- Executable page scripts (empty type, `module`, JavaScript, or ECMAScript
  MIME types) are moved to the Page JS workspace and keep a source-order slot.
- Inert data/template scripts such as `application/json`, `importmap`,
  `speculationrules`, and `text/template` stay as raw HTML at their authored
  position. They are not mislabeled as executable JavaScript blocks.
- This distinction is generic and MIME-based; it is not tied to a particular
  sheet or reference sheet family.

Preview execution boundary:

- Ordinary page scripts remain lossless in the authored JS workspace and source
  emission, but are removed from the local visual preview document so inline
  code and external `src` resources cannot execute while a user is editing.
- Final Roll20 `sheet.html` excludes every non-Worker script because Roll20
  cannot execute page JavaScript. ZIP export copies the exact removed tags into
  `unsupported-script-source.txt`; that backup is not uploaded or executed.
- Only scripts classified as Roll20 worker source are retained in the preview
  document. This is a runtime-safety boundary, not a claim that arbitrary
  page JavaScript is supported by Roll20.

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

Roll20 sheets often show only one default view until a checkbox, radio, hidden
attribute, or Sheet Worker initialization changes state.

Required model:

- Hidden input/radio/checkbox controls must be imported.
- CSS sibling selectors such as `:checked ~ .sheet-section` must be preserved.
- Sheet worker initialization that sets default attrs must be simulated when possible.
- Preview may expose a user-facing state panel for defaults without hardcoding
  any sheet family or campaign vocabulary.
- "Legacy sanitization" must not erase default-view behavior unless the export report explicitly says what changed.

## Legacy Sanitization

Legacy Roll20 sanitization must be an explicit toggle:

| Mode | Behavior |
|---|---|
| Off | Preserve authored HTML/CSS/Worker output, remove app-internal preview attributes, and exclude non-Worker scripts into the ZIP text backup. |
| On | Apply documented Roll20 legacy-safe transformations, exclude non-Worker scripts into the same ZIP text backup, and emit a warnings report. |

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

Rolltemplate source mapping has one extra ordering rule: the direct children of
`<rolltemplate>` are walked with the same text/comment/element walker as normal
containers. This preserves root-level `{{#section}}`, `{{field}}`,
`{{/section}}`, whitespace boundaries, and trailing literal text in the block
workspace before chat simulation. The rule is generic and does not depend on a
sheet name or a particular template style.

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

- Source-specific parser branches or class-name fingerprints.
- System-specific state hardcoding in generic runtime code.
- Reporting aggregate PASS when a subset failed.
- Hiding raw unsupported content without representing it as a block.
- Treating visual preview as verified without Roll20 sandbox or screenshot evidence.
- Writing into source corpus folders.

## Translation Normalization

Translation input is normalized through one generic path for preview, edit,
and Roll20 export:

1. A valid flat JSON string map is preserved with scalar values normalized to
   strings.
2. The editor comment format remains supported as a fallback.
3. Legacy flat maps with unescaped quotes inside values may use the tolerant
   key/value boundary recovery path. Recovered output is emitted as valid flat
   JSON, without sheet-specific keys.
4. Nested locale objects and arrays are not silently treated as Roll20 flat
   maps; they remain an explicit unsupported/empty normalization result until
   a locale-selection contract is provided.
