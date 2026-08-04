# Local Corpus Harness

Date: 2026-08-04

## Purpose

This harness measures import, block mapping, local Preview/Edit rendering, and
semantic roundtrip behavior across protected local sheet sources. It does not
publish or identify those sources, and it does not replace actual Roll20
verification.

## Local Configuration

Create `.tmp/corpus-harness/config.json`. The file and every generated output
remain ignored.

```json
{
  "version": 1,
  "roots": [
    { "id": "corpus-01", "path": "<protected-path>", "mode": "auto" }
  ],
  "reportDir": "reports/corpus-harness",
  "cacheDir": ".tmp/corpus-harness",
  "concurrency": 2
}
```

`mode` accepts `modern`, `legacy`, `both`, or `auto`. `auto` is conservative:
it runs both modes unless trusted local manifest metadata selects one mode.

## Commands

```text
corepack pnpm run harness:corpus:scan
corepack pnpm run harness:corpus:changed
corepack pnpm run harness:corpus:full
corepack pnpm run harness:corpus:select
```

- `scan`: read-only discovery and anonymous inventory. It never reports Alpha
  progress.
- `changed`: reuse current cache and run only missing current input/code keys.
- `full`: require a result for every discovered mode row; `--force` bypasses
  cache when diagnosing transient failures.
- `select`: greedily choose anonymous feature-cover representatives for actual
  Roll20 verification.

Each browser case runs in its own Node and Chromium process. Temporary source
copies and child reports are removed after one anonymous result envelope is
written. A case timeout or crash becomes a failed generic result and does not
stop later cases.

## Evidence Levels

| Level | Meaning |
| --- | --- |
| L0 | Live app import created blocks without a crash. |
| L1 | Structured plus raw fallback mapping accounts for HTML/CSS units and records zero unexplained drops. |
| L2 | Emit and reimport preserve normalized output plus block types, hierarchy, and fields. |
| L3 | Original source and first emit match under documented normalization. |
| L4 | Representative actual Roll20 visual verification. Local Harness never grants L4. |

`runtimeClean` means zero browser console and page errors. External image/font
load warnings remain visible as `resourceWarnings`, `resourceClean`, and the
`asset` diagnostic, but do not turn an otherwise valid local L2 roundtrip into
a crash. Asset fidelity is closed only by the separate actual Roll20 gate.

L2 field comparison keeps exact values by default. It accepts only bounded
semantic normalizations already proven stable by emitted output: boundary
whitespace for text/style/script source, browser-equivalent inline style, and
equivalent HTML boolean-attribute values. Authored input names, translation
keys and values, block types, hierarchy, and all other fields remain exact.
Imported element snapshots use JSON `[]` even when no attribute was authored;
an empty Blockly field is reserved for a newly created block. This lets the
emitter preserve omitted browser-default attributes while gallery blocks keep
their explicit design defaults. Attribute diagnostics compare names instead of
array positions and never persist attribute values.

L2 topology uses a canonical forest, not Blockly's block-creation array.
Random block IDs and independent-root creation order are ignored. Named input
slots and their targets remain explicit, and each `next` chain preserves real
sibling order. The canonicalizer is iterative so dense sheets do not overflow
the JavaScript stack. A Harness version change invalidates older cached rows.

Preview/Edit equality is a separate local check inside the cache envelope. It
uses the same persistent iframe in both modes and checks pixels, form state,
root geometry, console errors, page errors, and resource warnings.

## Privacy And Cache

- External roots are read-only.
- Persisted rows contain anonymous IDs, hashes, generic feature tokens, level
  booleans, generic diagnostic categories, and aggregate counts only.
- No source path, sheet name, creator, visible text, class token, attribute
  value, URL, screenshot, or child report survives case cleanup.
- Cache identity includes SHA-256 digests of every input file, current Git SHA,
  compatibility mode, and Harness version. A file digest is read once per run
  and reused when multiple discovered cases reference the same local asset.
- Commit only synthetic self-tests. Never commit config, cache, results, or
  protected source copies.

## Claim Boundary

A successful `scan` proves discovery only. A complete local baseline can score
at most the 35-point corpus roundtrip gate plus the 25-point local Preview gate.
Actual Roll20, export/diagnostics, and Alpha UX/CI weights remain zero until
their own evidence gates pass.
