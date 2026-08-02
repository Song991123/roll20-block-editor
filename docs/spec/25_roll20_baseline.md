# Roll20 Baseline Contract

Date: 2026-08-03

## Goal

Local Preview and Edit reproduce the relevant Roll20 character-sheet wrapper
and baseline without allowing application CSS to alter the authored sheet.
This contract is system-agnostic and contains no source-sheet evidence.

## Source Boundary

- Curated baseline files live under the workspace compatibility root and are
  copied or bundled through the product's baseline module.
- Baseline updates require an official or directly observed Roll20 source and a
  generic synthetic regression.
- Do not commit Roll20 room screenshots, copied third-party sheets, or
  source-derived measurements into this specification.

## Required Wrapper

The local sheet document provides the Roll20 dialog, form, and character-sheet
class context. The authored sheet mounts only inside the `.charactersheet`
root. Application header, sidebars, toolbars, inspector, chat pane, and editor
overlays remain outside that document.

## Cascade Order

1. Roll20 baseline CSS.
2. Compatibility/runtime CSS.
3. Authored and managed user CSS.
4. Editor-only outline/filter CSS.

The last layer may provide selection and drop feedback only. It must not change
layout, box sizing, typography, intrinsic dimensions, or exported CSS.

## Isolation

- Preview/Edit use a sandboxed iframe as the canonical surface.
- Tailwind and application global styles do not enter the iframe.
- User CSS cannot style the parent application shell.
- Rolltemplate source and runtime scripts do not appear as visible sheet nodes.
- Internal editor data attributes are removed at export.

## Geometry

- The authored sheet controls its intrinsic width unless the user explicitly
  sets a canvas width for authoring.
- Height follows the authored root and visible overflow; no fixed blank tail.
- Zoom scales the whole rendered sheet as one surface and does not rewrite
  responsive CSS or change the authored width.
- Preview and Edit use the same geometry and scroll state.

## Form And Runtime Defaults

The baseline includes Roll20-like defaults required by ordinary controls,
disabled state, Roll buttons, repeating controls, and dialog context. Authored
CSS remains later in the cascade and may override those defaults according to
Roll20 selector behavior.

## Modern And Legacy

The shared baseline is not a compatibility sanitizer. Modern preparation and
legacy CSS sanitizing remain separate operations described in
`docs/spec/30_roll20_actual_sandbox_contract.md`.

## Verification

Local acceptance requires:

- iframe and Shadow/fallback serializers use the same baseline sources;
- Preview/Edit screenshots match for anonymous synthetic input;
- computed wrapper and sheet-root styles come from the expected source layer;
- application styles do not appear in the iframe stylesheet;
- no dialog chrome or blank starter object appears as sheet content;
- intrinsic width/height and whole-sheet zoom remain stable;
- console and resource errors are classified.

Actual parity requires separate modern Sandbox and legacy test-room evidence
under the local-only procedure. A local baseline pass alone is never Roll20
visual parity.
