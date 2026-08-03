# JavaScript Runtime Boundary

Status: CURRENT CONTRACT

This document defines how authored JavaScript is handled without confusing
editor behavior with Roll20 behavior or silently changing a sheet's source.

## Current Contract

| Source | Blockly location | Local preview/edit | Export |
| --- | --- | --- | --- |
| ordinary page `<script>` | inert stored-JS workspace with source-order slot | omitted; never executed | excluded from `sheet.html`; exact tag copied to ZIP text backup |
| external page `<script src>` | inert stored-JS workspace with source-order slot | omitted; external file is not loaded | excluded from `sheet.html`; exact tag copied to ZIP text backup |
| data/template `<script>` | HTML raw block at authored position | omitted; never displayed | excluded from `sheet.html`; exact tag copied to ZIP text backup |
| explicit `<script type="text/worker">` | worker workspace | executed by the Roll20 worker bridge | emitted once as the worker script |
| untyped Roll20 API script | worker workspace when recognizable | executed by the worker bridge | emitted once as the worker script |
| unsupported worker statement | raw worker block | preserved for runtime | emitted without pretending it is mapped |

The preview must never execute ordinary page JavaScript. This prevents an
imported sheet from changing the editor page, loading arbitrary external code,
or creating a second source of truth outside the canonical iframe. Roll20
worker code is the only authored script boundary currently simulated.

## Invariants

1. Import and authored source emission must preserve an ordinary page script's
   tag, attributes, body, and relative HTML position. Final Roll20 payload
   preparation is a separate explicit filter.
2. A worker script must not remain visible as a sheet canvas object and must
   appear at most once in emitted HTML.
3. A partially mapped worker must fall back to raw source instead of losing
   statements or claiming complete block mapping.
4. Preview, edit, live patch, and Shadow fallback must apply the same script
   visibility rule.
5. Preview-only sanitization must not mutate authored source. Final Roll20
   `sheet.html` removes non-Worker scripts and the ZIP keeps their exact tags in
   `unsupported-script-source.txt`, which must not be uploaded or executed.

## Inert Source Workspace

The generic stored-JS workspace carries:

- stable script id and original document order;
- original tag attributes (`type`, `src`, and other authored attributes);
- inline body or external source reference;
- an inert preview policy;
- raw fallback when a block mapping cannot reproduce the original source.

The authored emitter reconstructs those records into original HTML order.
Final Roll20 preparation then removes every non-Worker script and creates the
text backup. Generic page JS never runs in the editor or Roll20; behavior users
need in Roll20 belongs in the Worker workspace.

## Acceptance Gates

- typed and untyped page-script authored-roundtrip tests remain green;
- final Roll20 `sheet.html` contains no non-Worker script, and ZIP backup keeps
  the exact removed tags;
- preview and live-patch documents contain no ordinary page script or external
  page-script request;
- worker state and rolltemplate smoke remain green in modern and legacy modes;
- browser roundtrip proves the source is stable after import/export;
- actual Roll20 Sandbox/test-room evidence is collected separately from local
  script-boundary tests.
