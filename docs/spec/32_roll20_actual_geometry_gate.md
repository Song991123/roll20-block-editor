# Roll20 Actual Geometry Gate

Date: 2026-07-31
Status: ACTIVE

## Purpose

The local preview/edit smoke and a live Roll20 tab answer different questions.
This gate compares them without treating the Roll20 dialog shell as authored
sheet content.

The gate keeps five layers separate:

1. iframe viewport
2. Roll20 dialog/form wrapper
3. `.charactersheet` root
4. authored content canvas
5. normalized root crop

The local result is compared to an anonymous, ignored Roll20 sidecar. The
sidecar may contain only generic geometry, marker booleans, generation mode,
and safety status. It must not contain room identifiers, source identity, or
sheet source.

## Status Rules

| Result | Meaning |
| --- | --- |
| `FAIL` | A safety preflight, required marker, generation-specific layout, local preview/edit check, or authored-canvas geometry check failed. |
| `PASS_WITH_OPEN_PARITY_GAP` | The runtime and authored canvas are coherent, but crop normalization, attachment readback, wrapper alignment, or worker evidence is still open. |
| `PASS` | All supplied evidence is complete enough for the gate's promotion boundary. It is still not a universal all-sheet claim. |

The gate never turns a local screenshot match into a Roll20 parity claim. A
`PASS_WITH_OPEN_PARITY_GAP` result is the expected state until an external
same-payload attachment proof and normalized screenshot comparison exist.

## Generation Contracts

The sidecar must record the observed generic layout contract separately:

| Mode | `.sheet-2colrow` | `.sheet-col` |
| --- | --- | --- |
| modern | `block` | `inline-block` |
| legacy | `flex` | `block` |

Missing row/column nodes are reported as `NOT_APPLICABLE`; a present node with
the wrong display mode is a failure. Modern evidence never satisfies the
legacy check and vice versa.

## Current Evidence

The 2026-07-31 anonymous generic layout sidecars pass authored-canvas geometry,
generation-specific row/column behavior, required DOM markers, and chat
markers in both dedicated destinations. The Roll20 root is `852px` wide while
the local fixture root is `850px`; authored content is `760x320` in both.
Normalized root crop and external attachment readback hash remain open, so
both modes correctly stay `PASS_WITH_OPEN_PARITY_GAP` with promotion `HOLD`.
