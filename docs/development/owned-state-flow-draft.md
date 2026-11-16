# Owned local flow and nested callback draft

Implementation and independent regression sources are drafted and unverified.
No tests, experiments, translator/preparer execution, regeneration, compiler
diagnostics or Rust tools have run. The complete bulk requirement ledger remains
open, including standard iterator adoption and production caller coverage.

The state profile now checks lexical `let` initialized by an actually owned
JSON or owned JSON vector expression. Whole original native symbols bind each
assignment. The domain must remain identical and loan-free; shared inputs,
constant bindings, changed domains, property writes and captured mutable
bindings still refuse. Explicit compatibility-core operations express updates;
the source rule does not infer arbitrary IndexMut, Clone or user mutation.

Conditional statements may return or continue. A continuation after exactly
one terminating branch uses that actual surviving branch's checked facts,
including a dominating Some guard. Both independent interpreter implementations
carry explicit completion records and retain assignments to outer lexical
bindings. Branch-local declarations stay local. Rust emits `let mut` and
assignments; TypeScript emits ordinary lexical `let`. Canonical owned Rust
inversion reads and freshly reproduces those complete constructs.

Nested finite callbacks save and restore their actual expected return domain,
paired native callback declaration, result roots and current result joins.
Callback parameter shadowing binds the new original native symbol. Mutable or
move-only outer captures remain unavailable. The existing whole function
100,000-node/depth-160 limits, native/runtime sources and private issuers remain
required. This provides no new runtime workload, performance or parity claim.

`prepare-owned-state-flow.mjs` retains six complete prior implementations and
their native-selected substitution recipes. Earlier state and source-unit
producers compose these complete successors, including operations that do not
appear in the intermediate unit-source family. No original implementation or
inverse is replaced by a hash, saved verdict or candidate count.

Unrun independent cases cover old snapshots, branch updates, early returns,
owned vectors, guarded projections after a None return, nested predicates and
owned Option callbacks, shadowed callback parameters, strict TS, both
interpreters, complete Rust inversion and invalid captures/loans/returns. Native
Rust oracle source uses actual compatibility functions; execute it only in CI
after every required JavaScript stage is green for the same SHA.
