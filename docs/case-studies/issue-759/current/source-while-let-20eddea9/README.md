The complete focused cohort passed at frozen worker source
`20eddea9c7267f2901a70e2d3993a9263458cb38`: **184/184 in both engines**,
with no skips, timeouts or Node cancellations. This is focused evidence;
it does not establish the full JavaScript gate or complete Rust runtime parity.

| Frozen source | Cases | Node pass/fail | Bun pass/fail | Node seconds | Bun seconds |
| --- | ---: | --- | --- | ---: | ---: |
| `3dca23c0` initial | 183 | 181/2 | 181/2 | 58.814 | 42.155 |
| `2fa254ac` coherent repair | 183 | 182/1 | 182/1 | 59.896 | 43.909 |
| `20eddea9` fixture coverage | 184 | 184/0 | 184/0 | 59.539 | 45.114 |

The initial matching failures exposed an ambiguous intermediate Result field
projection and a source constant absent from per-file function closure
selection. The generic pattern planner now retains the actual selected
constructor, field and checked type at each path; ordered tag guards precede
projections. Forged and divergent paths remain refused. Actual constants named
by patterns enter the original per-file declaration closure and cannot become
fresh binders. The repaired pair passed all eight while-let cases; its remaining
failure was an older negative expectation for a valid Result tuple let-else.
That unchanged Rust body now runs against emitted JavaScript and strict compiled
TypeScript, with success/error-variant and malformed/proxy ABI controls.

The twenty files include 175 prior range/pattern/iterator/source/ownership
regressions, eight while-let cases and the new positive tuple let-else case.
Both targets use the same serialized/reparsed checked semantic vocabulary.
Original while-let token/raw spans and compiler source identities remain in
metadata. This admits existing immutable checked pattern bindings only;
owned or mutable borrows, let chains, Drop semantics and labelled/value loop
controls require their own proofs.

The lossless archive contains all six complete raw logs, before/after source
input receipts and manifests, the immutable runner, both complete Node failure
inventories, baseline equivalence evidence and the no-build-directory rescan.
Its 25 logical members include three verified hardlinks. Every member was
reopened with its exact byte length and SHA256; zero errors were found. The
preliminary two-phase archive builder is retained as UNRUN; only the corrected
three-phase builder executed. Git confirms original Rust/Cargo inputs did not
change. No corpus producer, profile producer, full gate or Rust build ran.

RUSAGE_CHILDREN records the maximum of terminated owned children, including
setup Git, rather than an aggregate process-tree peak. Bun supplies a complete
terminal summary and exit status but no separate cancellation count. The
source baseline's five documentation/evidence changes from tested `f962a03b`
to published `24cbcc00` are covered by the retained equivalence receipt.
