# Bounded formatting packet CLI draft

The shipped source entry is `tools/translation/propose-source-backed-formatting.mjs`.
From a receiving repository with the actual owned formatting facade and complete
physical Rust/Cargo inputs, select a fresh directory outside the source root:

```sh
node tools/translation/propose-source-backed-formatting.mjs \
  --root /path/to/receiving-repository --output /fresh/outside/formatting \
  --packet-storage gzip --progress
node tools/translation/propose-source-backed-formatting.mjs \
  --review /fresh/outside/formatting
```

The corresponding APIs are `proposeSourceBackedFormattingGzipPackets({root,
output}, progress)` and `reviewSourceBackedFormattingPackets(output)`. Progress
is optional, bounded scalar diagnostic data. Complete source and private proof
metadata never enter progress records. Source proposals are retained separately;
the CLI does not install application source.

The producer uses the actual `iterateSourceBackedCoreFormattingCorpusPackets`
API through separate language and repository rules. It retains the distinct
formatting schema, every physical row/status/refusal/origin/scope, every input,
every binding inspection, all module edges and diagnostics, metadata, complete
CST source, substitutions and full inverses. Rows are joined to actual captured
source and validated within a completed scope before the next primitive event.
No complete per-file proposal/CST array accumulates in the writer. Proposed
changed source is stored in separate packets and associated with each full row.

The independent readback opens the complete physical gzip inventory, decodes
every logical packet, checks canonical JSON and joins the complete captured
sources, Cargo, source census, rows, inspections, changed sources, metadata and
summary. It freshly reconstructs original and edited CST and checks every source
partition/inverse. It then rejoins the entire physical packet inventory and
index/storage bytes. This reviews archived source associations; it does not
rebind the archive to a later independently modified source checkout or prove
the semantics of a copied producer effect.

The outer index is `router-source-backed-formatting-packets-v1`; storage is
`router-source-backed-formatting-gzip-storage-v1`; incomplete receipts are
`router-source-backed-formatting-incomplete-v1`. These are separate from the
literal/JSON adoption schemas. The single formatting stage has `metadata`,
`rows`, `bindingInspections`, `inputs`, `moduleEdges` and `moduleDiagnostics`
packet references. Its archived corpus obeys the complete JSON wire equation
described in [the iterator contract](source-backed-formatting-packets-20261021.md).

`prepare-formatting-packet-cli.mjs --write` generates the bounded writer helpers
and full independent transport from actual native TypeScript 5.9.3 spans in
the existing packet writer and gzip reader. Original APIs remain unchanged.
`--emit` retains complete source preparation evidence; `--check` rejects stale
copies. Both outputs receive native lexical binding checks and separate
language/repository CST serialization, reparsing and whole-source inverses.
The new copied Cargo selector additionally captures every actual layout Cargo
input, including a nested crate's workspace manifest. The iterator still
receives only its exact crate-manifest/lock pair. All captured Cargo files and
the full physical source census are freshly rejoined after producer work and
again after all final JSON/hash/compression/progress work, before index rename.

All original storage limits remain unchanged: 1024 source files, 20000 path and
packet entries, two million UTF-16 units/eight million UTF-8 bytes per source,
32 Mi units across source, 64 MiB per logical packet, 1 GiB logical output,
384 MiB stored output and the existing failure reserve. The complete source
graph/private producer context remains resident; actual full-corpus time,
heap and RSS need receiving measurements. The byte bounds are not a CPU or
process-memory deadline, and this CLI does not alter any test/writer deadline or
Node heap default. Run actual production under the coordinator's existing
resource monitor. Refusal or failure retains partial evidence and an incomplete
receipt; a successful index is published only after all final guards.

The complete new receiving file is
`tools/translation/test/source-backed-formatting-cli.test.mjs`. It covers source
copy freshness/quotas, exact complete materialized/archive equality, actual CLI
and independent readback, changed physical storage, and actual writer hash
observations that mutate source, lock or workspace Cargo input. These tests and
the actual complete 564-file production workload remain unrun in this source
worker draft. A selection or changed-file count is not an executable coverage
gain. Receiving semantic targets, corpus measurement and the full same-SHA gate
remain separate obligations. No Rust tools ran locally.
