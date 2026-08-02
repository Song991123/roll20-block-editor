# Sanitizing And Default View

Date: 2026-08-03

## Separate Operations

- Selector/class preparation is not legacy sanitizing.
- Modern Sandbox preparation is not legacy sanitizing.
- Legacy CSS sanitizing is a dedicated compatibility transform.
- Preview, Edit, export, manifest, warnings, and verification target switch
  together when compatibility mode changes.

## Default State

- Preserve checked, selected, disabled, hidden, and initial value attributes.
- Preserve sibling/state selectors used for conditional panels.
- Preserve supported Sheet Worker initialization.
- A user-facing state control may expose generic attributes and values, but it
  must not encode a sheet family or campaign vocabulary.
- Sanitizing must not silently change the initial visible panel.

## Script Boundary

- Ordinary scripts are inert and invisible in Preview/Edit.
- Sheet Worker source is parsed or preserved through its separate runtime
  boundary.
- Unsupported worker syntax remains explicit and does not execute as page code.

## Verification

- Unit tests cover modern and legacy transforms independently.
- Synthetic browser tests cover checked/default state and conditional
  visibility in both local compatibility modes.
- Actual modern proof uses Custom Sheet Sandbox.
- Actual legacy proof uses a dedicated legacy-enabled test room.

No one mode or local sanitizer test proves the other destination.
