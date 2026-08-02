# Composite Block Contract

Date: 2026-08-03

## Purpose

Large imported sheets become unusable when every small DOM token is exposed as
an independent top-level editing object. Composite blocks reduce visual noise
without losing source semantics or creating source-specific parser branches.

## Rules

1. A composite represents a repeated generic structure, not a named sheet.
2. Matching must be conservative. Unknown children or attributes keep the
   atomic/raw path.
3. Every consumed source field remains editable or preserved explicitly.
4. Emit -> re-import must keep canonical structure and data.
5. Composite use must not change Preview/Edit rendering.
6. Internal composite identity is stripped only at export.
7. A composite may be expanded or inspected without requiring Blockly SVG for
   every atomic child.

## Current Generic Families

- attribute/result rows;
- repeated skill/control rows;
- repeating-section wrappers;
- semantic list containers and list items;
- conditional value-switch panels and cases;
- Rolltemplate card roots and rows;
- common table structures where direct-child validity is preserved.

## Matching Safety

- Require the expected direct-child order and tags.
- Preserve custom classes, attributes, inline styles, translation markers,
  default values, Roll commands, and unknown source fields.
- Reject a composite when extra semantics cannot be represented.
- Never use source names, source class families, or a private input fingerprint
  as a matcher condition.

## Editing Safety

- Composite roots participate in the same layer-role and drop rules as emitted
  HTML.
- Atomic rows may move as one unit but do not advertise arbitrary child slots.
- Table/list/conditional parent-child rules remain valid after moves.
- A conditional case owns a stable internal marker and retains its initial
  selected value.

## Performance Contract

- Measure block count, import time, render time, and interaction latency only in
  ignored local reports.
- Tracked status records generic pass/partial/fail, not source-derived counts.
- A composite is accepted only when it reduces meaningful editor work or
  memory/render cost and preserves fidelity.

## Verification

Each composite requires:

- positive and conservative-rejection synthetic tests;
- unknown attribute/style preservation tests;
- import -> emit -> re-import stability;
- Preview/Edit equality;
- valid structural layer movement where applicable;
- full import/export and compatibility regression gates.
