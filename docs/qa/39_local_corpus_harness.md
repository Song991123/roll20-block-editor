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
corepack pnpm run harness:corpus:cluster
```

- `scan`: read-only discovery and anonymous inventory. It never reports Alpha
  progress.
- `changed`: compare the last complete ignored run state with current input
  hashes and Git changes. Unaffected rows are re-keyed to the current Git SHA;
  changed inputs and affected runtime areas run again. Unknown runtime changes,
  missing state, or divergent Git history conservatively rerun every row.
- `full`: require a result for every discovered mode row; `--force` bypasses
  cache when diagnosing transient failures.
- `select`: greedily choose anonymous feature-cover representatives for actual
  Roll20 verification.

Add `--only <anonymous-id>` to `scan`, `changed`, or `full` for a focused local
rerun. Discovery writes a sensitive private index under `cacheDir`, one root at
a time. A later focused run resolves the anonymous ID through that index and
does not walk every protected root again. If the ID is absent from a complete
private index, run `scan` to refresh discovery instead of guessing a source
path.

Each browser case runs in its own Node and Chromium process. Temporary source
copies and child reports are removed after one anonymous result envelope is
written. A case timeout or crash becomes a failed generic result and does not
stop later cases.

`full` and `changed` require committed runtime code because Git SHA is part of
the cache identity. Dirty documentation and test files are allowed; dirty app,
runtime, dependency, or Harness files stop measurement instead of mixing two
code states under one key. The ignored `corpus-run-state.json` stores only the
last complete Git SHA and anonymous row/hash/cache-key tuples.

## Evidence Levels

| Level | Meaning |
| --- | --- |
| L0 | Live app import created blocks without a crash. |
| L1 | Structured plus raw fallback mapping accounts for HTML/CSS units and records zero unexplained drops. |
| L2 | Emit and reimport preserve normalized output plus block types, hierarchy, and fields. |
| L3 | Original source and first emit match under documented normalization. |
| L4 | Representative actual Roll20 visual verification. Local Harness never grants L4. |

`runtimeClean` means zero application-origin console errors and zero page
errors. External image/font request failures can also emit browser console
errors; the Harness classifies those with fixed privacy-safe categories and
keeps them visible as `resourceWarnings`, `resourceClean`, and the `asset`
diagnostic instead of calling them an application crash. Asset fidelity is
closed only by the separate actual Roll20 gate.

L2 field comparison keeps exact values by default. It accepts only bounded
semantic normalizations already proven stable by emitted output: boundary
whitespace for text/style/script source, browser-equivalent inline style, and
equivalent HTML boolean-attribute values. Authored input names, translation
keys and values, block types, hierarchy, and all other fields remain exact.
For `r20_css_decl`, whitespace outside quoted strings is also semantic because
the emitter may flatten a multiline declaration value. Whitespace inside
strings and escaped line breaks remain exact.
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
- `cacheDir/corpus-private-discovery.json` intentionally contains local source
  paths so focused reruns can avoid a full tree walk. It is sensitive ignored
  execution state: never print, copy into a report, or commit it.
- Persisted rows contain anonymous IDs, hashes, generic feature tokens, level
  booleans, generic diagnostic categories, and aggregate counts only.
- Cache envelopes and failure clusters may retain fixed runtime/resource
  categories such as `type-error`, `resource-load`, or `type:font`; they never
  retain the original message, host, URL, or local path.
- No source path, sheet name, creator, visible text, class token, attribute
  value, URL, screenshot, or child report survives case cleanup.
- Cache identity includes SHA-256 digests of every input file, current Git SHA,
  compatibility mode, and Harness version. A file digest is read once per run
  and reused when multiple discovered cases reference the same local asset.
- Incremental reuse is conservative. Import changes select matching artifact
  families, legacy sanitizing selects legacy CSS rows, renderer or unknown
  runtime changes select all rows, and input hash changes always rerun the row.
- Read-only discovery batches directory and file I/O with a fixed upper bound,
  caches repeated text reads for the current process, and emits only generic
  root/phase progress. Root checkpoints make an interrupted first discovery
  resumable without exposing source identity.
- Commit only synthetic self-tests. Never commit config, cache, results, or
  protected source copies.

## Claim Boundary

A successful `scan` proves discovery only. A complete local baseline can score
at most the 35-point corpus roundtrip gate plus the 25-point local Preview gate.
Actual Roll20, export/diagnostics, and Alpha UX/CI weights remain zero until
their own evidence gates pass.
