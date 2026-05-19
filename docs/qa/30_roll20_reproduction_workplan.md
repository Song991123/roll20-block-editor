# 30. Roll20 Reproduction Workplan

Date: 2026-05-19

This is the execution plan for making the editor honestly compatible with official Roll20 sheets, user custom sheets, and the YSHY commission sheets. It is written so Codex, Claude, or another agent can continue without guessing the user's intent.

## Core Goal

Build a Roll20 custom sheet editor where:

- All HTML/CSS/i18n/worker/rolltemplate source content maps to blocks.
- The visual editor is a friendly layer over the same block model.
- Edit canvas and preview canvas render from the same emitted HTML/CSS.
- Export can target modern Roll20 or legacy-safe Roll20 through an explicit toggle.
- Every "PASS" claim has a reproducible report.

## Current Reality Check

Do not start from the assumption that this is done.

Known from existing docs/code:

- `docs/validation/verify/emit_full_roundtrip_stage2.md` says full roundtrip was still failing in earlier verification.
- DnD 5e improved from `r2=234` to `r2=383`, but expression flattening remained a likely source of block loss.
- `lib/import/expression_parser.ts` currently handles single `@{...}` tokens, not full compound roll expressions.
- Export has a legacy CSS sanitizer path in `components/editor/ExportDialog.tsx` and `lib/emit/sanitize.ts`, but the UX is not sufficiently visible or complete as a global preview/export mode.
- Existing docs contain mojibake in several places, so future work should prefer new clean UTF-8 docs instead of editing those files unless needed.

## Task Split

### T0. Corpus Safety and Fixture Copying

Owner goal: never damage source folders.

Tasks:

- Add or use a workspace-owned fixture copy directory.
- Copy only selected fixture files into that directory.
- Hash original and copied files.
- Every report must include source path, copied path, and SHA-256.

Exit criteria:

- No generated files appear in the external source corpus.
- `docs/validation/27_source_corpus_manifest.md` stays accurate.

### T1. Batch Import Inventory

Owner goal: understand corpus shape before fixing one sample.

Tasks:

- Scan official Roll20 sheets, user custom sheets, and YSHY fixtures.
- For each detected sheet bundle, classify files as HTML, CSS, translation, worker JS, images, and documentation.
- Detect whether HTML contains inline `<script type="text/worker">`, `<rolltemplate>`, hidden inputs, `repeating_`, `:checked`, and default-era keywords.
- Produce a JSON/Markdown report under workspace docs or reports.

Exit criteria:

- A per-sheet manifest exists.
- Missing HTML/CSS/i18n pairs are flagged, not silently ignored.

### T2. Lossless Import Mapping

Owner goal: every source node is either mapped to a specific block or preserved as raw fallback with diagnostics.

Tasks:

- Verify HTML element coverage: tag, attrs, text, children, sibling order.
- Verify CSS coverage: selectors, declarations, at-rules, comments, unsupported syntax.
- Verify i18n coverage: JSON, flat text, Roll20 comment formats.
- Verify worker coverage: `on`, `getAttrs`, `setAttrs`, repeating section helpers, raw JS fallback.
- Verify rolltemplate coverage: hidden in sheet canvas but available to chat rendering.

Exit criteria:

- L1 structural reports show no unexplained drops.
- Raw fallback count is reported per file and per feature.

### T3. True Roundtrip

Owner goal: import -> emit -> import does not lose blocks or semantics.

Tasks:

- Extend expression parsing for roll button values beyond single `@{...}` tokens:
  - dice expressions such as `1d20`;
  - arithmetic such as `1d20+@{str_mod}`;
  - Roll20 inline rolls, query syntax, and selected/target references;
  - raw expression fallback with diagnostics when unsupported.
- Compare block tree fingerprints between first and second import.
- Compare HTML/CSS/i18n normalized output.
- Keep byte-identical and normalized-diff checks separate.

Exit criteria:

- Per-sheet L2/L3 reports exist.
- "100%" is only claimed for a named fixture and level.

### T4. Roll20 Preview Parity

Owner goal: local preview should look like Roll20, not like the editor website.

Tasks:

- Confirm app CSS cannot cascade into sheet render roots.
- Confirm Roll20 base CSS loads before user CSS.
- Confirm sheet canvas hides `script`, worker JS, and `rolltemplate`.
- Confirm translation file is applied before visual comparison.
- Use actual Roll20 screenshots for final L4 visual parity when possible.

Exit criteria:

- Computed-style origin/leak report exists.
- Screenshot diff report exists for at least one official fixture and YSHY 1부.

### T5. Default View and Sheet Worker Simulation

Owner goal: sheets that start in 1920/default mode or hide Pulp/era sections must behave like Roll20.

Tasks:

- Preserve hidden controls and `:checked` sibling selectors.
- Simulate basic sheet worker APIs in preview:
  - `on(...)`;
  - `getAttrs`;
  - `setAttrs`;
  - `getSectionIDs`;
  - translation helpers if used.
- Expose current preview attrs/state in a user-friendly panel.
- Do not hardcode "pulp", "1920", or YSHY names into generic runtime.

Exit criteria:

- CoC 7th official default view and YSHY default view can be toggled through generic controls.
- Reports distinguish CSS-only default logic from worker-driven default logic.

### T6. Legacy Roll20 Sanitization On/Off

Owner goal: support modern and legacy Roll20 without secretly mutating the sheet.

Current code notes:

- `components/editor/ExportDialog.tsx` has `legacyMode` state.
- `lib/emit/sanitize.ts` has `sanitizeForRoll20Legacy(css)`.
- The export dialog applies sanitizer only when `legacyMode` is true.

Required improvements:

- Make the option visible with clear Korean wording:
  - "구버전 Roll20 무해화"
  - "끄면 원본 CSS 그대로 내보냄"
  - "켜면 구버전에서 막히는 CSS를 변환/제거하고 보고서를 첨부"
- Include a `sanitize-warnings.json` or equivalent report in the exported zip.
- Add preview-level mode or at least a "legacy export preview" diff report.
- Add static CSS scan report before asking Roll20 MCP to verify.

Static scan candidates:

| CSS Feature | Legacy Risk Action |
|---|---|
| `transform: scale(...)` | Convert to `zoom` if safe. |
| Complex `transform` | Preserve or remove only with warning. Needs Roll20 measurement. |
| `animation`, `animation-*`, `@keyframes` | Remove or warn in legacy mode. |
| CSS variables `var(--x)` | Inline fallback if resolvable; warn if not. |
| `position: fixed` | Convert to `absolute` or warn. |
| `position: sticky` | Convert to `relative` or warn. |
| modern selectors such as `:has(...)` | Warn until Roll20 sandbox measurement proves support. |
| viewport/container units | Warn until measured. |

When to use Roll20 MCP:

- After static scan identifies a short list of risky CSS features.
- For real sandbox A/B tests with legacy mode on/off.
- For screenshots or computed styles that local preview cannot prove.

What to give Claude/Codex:

```text
Task: Legacy Roll20 sanitization audit.

Read:
- docs/validation/27_source_corpus_manifest.md
- docs/spec/29_universal_roll20_mapping_contract.md
- docs/qa/30_roll20_reproduction_workplan.md
- docs/spec/19_sanitize_and_default_view.md
- lib/emit/sanitize.ts
- components/editor/ExportDialog.tsx

Rules:
- Do not edit any external source corpus folder.
- First produce static CSS feature counts for official samples, custom samples, and YSHY.
- Do not claim Roll20 behavior unless measured in Roll20 or clearly labeled as inferred.
- Implement on/off only as explicit preview/export setting.
- Export must include sanitizer warnings.
```

Exit criteria:

- On/off toggle is visible and tested.
- Exported modern CSS equals unsanitized CSS.
- Exported legacy CSS differs only through documented sanitizer rules.
- Warnings report is included and readable.

### T7. User-Friendly Visual Editing

Owner goal: block coding remains available, but normal users can work visually.

Tasks:

- Layer panel lives with edit canvas.
- Layer rows should show type, label, nested hierarchy, visibility/lock when implemented.
- Dragging an object inside a frame should reparent or reposition relative to that frame according to user intent.
- Absolute positioning inside a frame must use the frame as containing block.
- Edit and preview must be visually identical except edit selection handles.

Exit criteria:

- If two objects overlap in edit mode, they overlap in preview mode.
- Drag result appears immediately and does not roll back while HTML/CSS emission catches up.
- Reparenting and absolute-inside-frame behavior are documented in diagnostics.

## Reporting Format

Every validation run should include:

```text
Fixture:
  source:
  copied_fixture:
  sha256_html:
  sha256_css:
  sha256_i18n:

Import:
  html_blocks:
  css_blocks:
  i18n_blocks:
  worker_blocks:
  rolltemplate_blocks:
  raw_fallback_blocks:
  warnings:

Roundtrip:
  r1_blocks:
  r2_blocks:
  normalized_html_equal:
  normalized_css_equal:
  normalized_i18n_equal:
  byte_html_equal:
  byte_css_equal:
  byte_i18n_equal:

Preview:
  roll20_base_loaded:
  app_css_leaks:
  scripts_hidden:
  rolltemplates_hidden:
  screenshot_diff:

Result:
  level: L0/L1/L2/L3/L4
  pass: true/false
  open_gaps:
```

## First Batch Recommendation

Use this order to avoid session overload:

1. YSHY 1부 HTML/CSS/translation.
2. `Call_of_Cthulhu_7th_Ed` official.
3. `DnD_5e` official.
4. `13th Age by Roll20` official.
5. Top 10 largest user custom sheets from `D:\훙냥냥\마렌상\티알\[중요]커스텀시트`.
6. Then expand to the full corpus.

This order covers translation-heavy custom sheets, CoC default-era behavior, roll expression-heavy official sheets, and smaller fast smoke tests.

