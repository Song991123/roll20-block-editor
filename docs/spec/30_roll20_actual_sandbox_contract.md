# Roll20 Destination Contract

Date: 2026-08-03

## Purpose

Preview, Edit, and export must prepare one authored sheet consistently while
keeping modern and legacy Roll20 behavior as separate destinations.

## Shared Input

Each render/export request owns one atomic input:

- authored HTML;
- authored CSS;
- translation JSON;
- compatibility mode;
- document language;
- explicit user asset replacements;
- inert Sheet Worker source;
- runtime/default attribute state.

Preview and Edit must consume the same prepared input. A mode switch must not
mix HTML from one compatibility mode with CSS or runtime state from another.

## Wrapper Context

The local sheet surface reproduces the relevant Roll20 wrapper chain:

```html
<div class="ui-dialog ui-widget ui-widget-content ui-corner-all">
  <div class="dialog largedialog characterviewer">
    <div class="tab-content">
      <form class="sheetform">
        <div class="charactersheet tab-pane active charsheet">
          <!-- authored sheet -->
        </div>
      </form>
    </div>
  </div>
</div>
```

Application chrome and editor overlays remain outside this document. Dialog
title bars or blank starter nodes are not authored sheet content.

## Modern Destination

- Preserve authored class tokens according to the modern Roll20 contract.
- Apply modern Sandbox preparation only when that destination is selected.
- Keep ordinary scripts inert and strip unsupported visible runtime nodes.
- Preserve Sheet Worker source for the worker boundary.
- Treat Custom Sheet Sandbox as modern-only actual evidence.

## Legacy Destination

- Apply the dedicated legacy CSS sanitizer at export/render preparation.
- Keep legacy transforms distinct from selector prefixing and modern Sandbox
  preparation.
- Switch Preview, Edit, HTML, CSS, manifest, warnings, and verification target
  together.
- Verify in a dedicated legacy-enabled test room, not modern Sandbox.

## CSS Order And Isolation

Within the sheet document, source order is:

1. Roll20 baseline and wrapper rules;
2. compatibility/runtime rules;
3. authored or managed user CSS;
4. editor-only selection/filter rules.

Application Tailwind or shell CSS must never enter the iframe stylesheet.
Editor-only rules may outline or filter elements but must not change authored
layout, box model, typography, or export output.

## HTML And Runtime

- Internal block IDs may exist in Preview/Edit and must be removed from export.
- Rolltemplates stay hidden on the sheet surface and render through the result
  card/chat path when invoked.
- Ordinary page JavaScript stays invisible and non-executable.
- Supported Sheet Worker code runs only through the controlled worker runtime.
- Unsupported source remains explicit; it is never silently reported as mapped.

## State And Translation

- Checked/selected/default values survive import and emit.
- Conditional visibility uses authored controls/selectors or worker state.
- Translation keys, placeholders, and document language use one shared payload.
- Preview/Edit may expose a user-facing state control, but must not hard-code a
  particular sheet family or campaign era.

## Assets

- Preserve authored remote URLs unless the user explicitly replaces them.
- Diagnose local, data, protocol-relative, blocked, or unreachable resources.
- Do not rehost, bundle, or commit third-party assets.
- Actual verification uses only user-owned or copyright-safe assets.

## Acceptance

Local gates must prove:

- modern and legacy stay independent;
- Preview and Edit use one iframe and one prepared contract;
- app CSS does not leak into the sheet;
- internal editor markers do not enter export;
- scripts stay inert and Rolltemplates stay off the sheet surface;
- synthetic import/edit/export remains stable.

Actual parity additionally requires the procedure in
`docs/operations/37_roll20_actual_verification.md` for both destinations.
No historical payload result or source-derived measurement belongs in this
specification.
