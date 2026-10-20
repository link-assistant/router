# Production translation frontier DATA

`tools/translation/report-production-frontier.mjs` joins the complete retained
function inventory to the actual stored project refusals. It produces a bounded
gzip DATA report. It never invokes a compiler, grants semantic authority,
regenerates output or measures new executable coverage.

The retained inventory's `module-binding` envelope obscures the project
compiler's earlier, more specific refusal. The report keeps both observations
and identifies their original source, source hash, function hash, UTF-16 and
UTF-8 span, name and diagnostic span. It authenticates every retained function's
status and diagnostic against its complete original source-metadata item array.
Missing sources, omitted functions, forged hashes, changed spans and substituted
statuses cannot silently change the denominator.

For the complete 2026-10-21 retained production inventory, the historical
measurement is 155 executable top-level functions out of 2567 (6.04%). An 80%
threshold requires at least 2054 executable functions, or 1899 additional
functions. The report repeats this historical arithmetic; it does not update
the measured numerator. Nested functions inside carried enclosing items and
methods remain outside that denominator.

## Reproduce and inspect

Supply the complete original function evidence produced for that exact
inventory, including every production source and each source-metadata descriptor:

```sh
node tools/translation/report-production-frontier.mjs \
  --root /absolute/checkout \
  --functions /absolute/complete-original-function-priority-DATA-v2.json.gz \
  --output /absolute/new-production-frontier-DATA.json.gz
```

The default inventory is `parity/rust-source-inventory.json`; the default
project descriptor is `tools/translation/projects/rust/src/lib.meta.json`.
`--inventory` and `--project` accept alternate repository-relative inputs.
Outputs are created exclusively, so a prior report is never overwritten.
Each input file is limited to 64 MiB and aggregate input and decoded output to
512 MiB. Gzip evidence expands under the same per-file bound. No dependencies
are installed, persistent caches written or network requests made.

Sparse checkouts can explicitly select complete immutable 40-character commit
IDs with `--project-revision SHA` and `--missing-input-revision SHA`. The first
reads the descriptor from that commit. The second reads only physically missing
inputs from that commit in a single bounded Git batch. Physical files take
precedence, including current edits. Every read's origin and revision remain in
the report and each vector's `observation`. `observedSha256` and `observedSource`
refer to that declared origin. Separate unobserved-physical-input counts and a
mixed-observation status prevent explicit Git objects from becoming physical
current-input claims. Omit the options to expose missing physical inputs.

The report retains the complete project root descriptor, contexts, source
descriptors, original compiler fingerprints and every input vector. Large
checked-program, target-program and concrete-syntax components are deliberately
not read: their descriptors are DATA, and this report does not validate those
components or their combined logical program hash. Every inventory source is
retained as observed source text where available, together with complete retained
production source text. Stored project source hashes must match the retained
source before a refusal can join a function.
Distinct inline module contexts can share the same complete source path/hash;
all contexts remain retained. Duplicate contexts and conflicting hashes refuse.

`staleness` separates each changed or missing compiler input from source changes.
Even entirely matching hashes leave `verdictStatus` equal to
`historical-not-reexecuted`. Fresh compiler verdicts, generation freshness,
whole-function execution and the complete JavaScript gate require their own
checks.

## Choose large source batches

`exactRefusalGroups` ranks the actual stored `(kind, message)` pairs by distinct
joined function count. Each group retains all original refusal record indexes
and function indexes. `investigationBatches` groups related observed messages
and lists their complete source units. The grouping is an investigation aid;
its members can require different repairs. Unjoined and ambiguous records stay
visible in `completeness`. No missing join becomes a successful function.

The retained project has 2311 production `fn` refusal records. Its largest
specific first refusals include 333 format-owner records, 141 mutable-reference
records, 106 shadowed borrowed-`str` records, 95 `State` generic-type records,
79 matches-owner records, 70 unresolved `AppState` records, 53 shadowed `Result`
records and 47 unresolved `Path` records. These are historical record counts,
not disjoint coverage gains or fresh verdicts. Use the report's distinct
function memberships before selecting a batch.

The following shared work fits those observations:

| Batch | Implement and independently qualify | Next source qualification |
| --- | --- | --- |
| Original namespace and primitive identity | Carry genuine source scopes, primitive/prelude identity, imported aliases and their conflicts through the existing checker boundary. Preserve shadowing and inactive/unknown configuration refusals. | Complete original functions with `str`, `Result`, `Option`, `Path` and application type refusals, then every affected source unit. |
| Formatting and macro owner context | Preserve genuine macro registration, original template, argument evaluation and checked Display/Debug obligations. A lexical macro name cannot resolve its owner. | Complete original format/matches/JSON functions, including overlap with namespace and borrowing batches. |
| Mutation and borrowing | Qualify concrete alias lifetimes, reborrows, assignment targets and observable mutation through reusable language rules. An immutable projection cannot substitute for mutation. | Complete original functions with mutable-reference and assignment refusals; keep shared-reference controls. |
| Framework and generic layouts | Implement explicit checked `State`/application payload and other generic layouts, or maintainer-authorized paired compatibility abstractions with complete source inverses and independent checks. | Whole source units containing the actual type refusals, retaining framework effects and ownership limitations. |

`tokenUsage` uses the repository's opaque-aware Rust token reader. It excludes
comments, quoted strings, raw strings and character literals, retains occurrence
spans, and recognizes separated macro-name/`!` tokens and `& mut` sequences.
Selectors are derived from actual messages plus explicit common macro/async
tokens. These are lexical occurrence hints, not resolved invocations, parsed
type usages or executable evidence. Scan errors remain explicit and reduce
token evidence; they never establish absence. Token and refusal-family overlap
tables list complete intersecting function sets.

Removing a first refusal can expose the next one. Do not add group, record,
token or source-unit counts to estimate gains. After implementing a batch,
rerun the actual source compiler and independently check whole functions before
reporting any change to 155/2567. Preserve the historical report for comparison.

The reusable report API is `productionFrontierData` in
`tools/translation/production-frontier-data.mjs`. Its complete focused controls
are `tools/translation/test/production-frontier-data.test.mjs`. The API reads
all inputs afresh per invocation and has no cross-invocation cache. This DATA
tool adds no language or repository translation rules and does not change their
existing two-sequence contracts.
