# JavaScript Runtime Boundary

Status: CURRENT CONTRACT + FUTURE EXTENSION PLAN

This document defines how authored JavaScript is handled without confusing
editor behavior with Roll20 behavior or silently changing a sheet's source.

## Current Contract

| Source | Blockly location | Local preview/edit | Export |
| --- | --- | --- | --- |
| ordinary page `<script>` | HTML raw block | omitted; never executed | preserved in its HTML position |
| external page `<script src>` | HTML raw block | omitted; external file is not loaded | preserved with its attributes |
| explicit `<script type="text/worker">` | worker workspace | executed by the Roll20 worker bridge | emitted once as the worker script |
| untyped Roll20 API script | worker workspace when recognizable | executed by the worker bridge | emitted once as the worker script |
| unsupported worker statement | raw worker block | preserved for runtime | emitted without pretending it is mapped |

The preview must never execute ordinary page JavaScript. This prevents an
imported sheet from changing the editor page, loading arbitrary external code,
or creating a second source of truth outside the canonical iframe. Roll20
worker code is the only authored script boundary currently simulated.

## Invariants

1. Importing and exporting an ordinary page script must preserve its tag,
   attributes, body, and relative HTML position.
2. A worker script must not remain visible as a sheet canvas object and must
   appear at most once in emitted HTML.
3. A partially mapped worker must fall back to raw source instead of losing
   statements or claiming complete block mapping.
4. Preview, edit, live patch, and Shadow fallback must apply the same script
   visibility rule.
5. Exported source must not be changed by preview-only sanitization, proxying,
   or script blocking.

## Future Generic JS Workspace

Do not add a generic `js` workspace by merely moving every `<script>` node out
of HTML. A safe implementation needs a source record that carries at least:

- stable script id and original document order;
- original tag attributes (`type`, `src`, and other authored attributes);
- inline body or external source reference;
- preview policy (`inert`, `worker`, or explicitly user-enabled sandbox);
- raw fallback when a block mapping cannot reproduce the original source.

The emitter must reconstruct those records into the original HTML order. If it
cannot prove that order and attributes are preserved, the source stays in an
HTML raw block. Generic page JS must remain opt-in and sandboxed; it must never
run in the editor's parent document.

## Acceptance Gates

- typed and untyped page-script export tests remain green;
- preview and live-patch documents contain no ordinary page script or external
  page-script request;
- worker state and rolltemplate smoke remain green in modern and legacy modes;
- browser roundtrip proves the source is stable after import/export;
- actual Roll20 Sandbox/test-room evidence is collected separately from local
  script-boundary tests.

