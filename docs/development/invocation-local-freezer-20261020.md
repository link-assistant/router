# Invocation-local completed traversal arithmetic

The private freezer can reuse completed scalar traversal costs only inside the
current synchronous retained proof invocation. Its factory key stays private,
records have weak object keys, and admission stops at 32,768 records. Closing
the invocation releases its map. No source, owner, digest, encoded result or
eligibility decision is stored. All three original global partitions, their
capacities and the 64-cell policy remain unchanged. Source and owner validation
and digest callbacks still run afresh.

`prepare-invocation-local-freezer.mjs --emit` derives both complete sources from
their pinned normal-Git originals. Separate language and repository sequences
retain native syntax, serialized/reparsed CST and whole inverses. Its `--check`
and the generated historical-reader producer are mandatory. Existing old
freezer comparisons retain their exact old algorithms and case bodies; the new
complete suite independently exercises the actual invocation-local path.

All 57 cases in seven complete control files pass under Node (92.192 seconds,
1,285,242,880 bytes peak aggregate RSS) and fresh sequential Bun (63.682 seconds,
1,572,634,624 bytes). Independent source-declared deadline audits pass.
All 24 cases across three complete parser/source-bank files also pass in Node
in 172.999 seconds, with 1,222,574,080 bytes peak aggregate RSS.

The same three-file Bun attempt remains RED: the first two complete files pass
all sixteen cases, then the source-bank lifecycle file exceeds the unchanged
3 GiB aggregate limit. The monitor terminates that attempt at 116.121 seconds
with 3,284,910,080 bytes sampled peak RSS. Its complete earlier file reports and
resource receipt remain retained. The temporary runner buffered the final
child's streams, which were not recovered after termination; do not describe
that missing stream as a complete failed-file report. Future diagnostics must
stream child output directly to files before waiting.

The complete original derive file retains all twelve passing Node assertions,
but its long case takes 92,162.759 ms against the unchanged 60,000 ms deadline.
Bun records eleven passing cases and that same case failing at 67,273.857 ms.
Earlier complete observations were 102,930.285 ms in Node and 101,634.282 ms in
Bun. These observations do not qualify the deadline or establish a full-corpus
speed gain. The separate metadata-sharing experiment remains reverted.

Complete evidence is retained in task-owned temporary directories with prefixes
`router-invocation-freezer-` and `router-layout-check-invocation-freezer-`, plus
`router-layout-check-invocation-local-freezer-`. The final source packet rejoins
all 867 tracked Rust/Cargo files, including generated witnesses, and all 132
installed TypeScript files unchanged. Original application coverage has not
increased. Current compiler/export refresh, full canonical/profile production,
reverse freshness, strict parity, original performance frontiers and the full
same-SHA JavaScript gate remain unfinished. Rust remains CI-only after all
eight JavaScript stages pass for that same SHA; Rust failures remain fatal.
