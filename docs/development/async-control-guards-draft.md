# Terminal guard continuations in async resource flow draft

This implementation and all new cases are source drafted, unrun. It proves no
current production coverage, source-history qualification, strict TS result,
full native behavior, synchronization parity, freshness or green gate.

Original cold async control callers now accept a terminal guard followed by a
complete remaining return path, single return branches and terminal else-if
chains. A guard's then path is independently checked as a complete return; its
remaining tail is independently checked as the other path. Paths that fall
through, lack a return or disagree on the return domain refuse. Existing
complete if/else block programs retain the same IR structure. Guard continuation
DATA records only the actual remaining statement count; no tail source strings
or native AST verdicts are duplicated or saved across operations.

Both branch checkers receive separate current binding snapshots and the same
original shared cell/depth budgets. Every existing move, exclusive receiver
cleanup, complete Result propagation, child cancellation, deadline callback and
cold polling rule remains. A comparison does not qualify a missing input range
guard, and a guard return cannot drop or return an already consumed channel pair.
No broader conditional deadline callback or pending-future permission is added.

The existing emitter writes canonical complete if/else branches. Its independent
Rust consumer still projects the full canonical source, freshly checks the
complete JS proposal and reproduces every original Rust token. The originating
JS/TS source remains intact with its whole CST, semantic-meta and inverse
history. Arbitrary original Rust control syntax outside that canonical inverse
remains a separate obligation; this change does not claim a universal inverse.

Two full source equations retain the complete original checker, native function
owner and both language/repository phases. Independent written cases cover all
Boolean paths, numeric entry/branch boundaries, cold cancellation, each receiver
cleanup path, strict TS, canonical Rust inversion, original source spans and
metadata tampering, fall-through/missing-tail/type/unreachable-source refusals.
Native terminal-guard truth-table and u64 boundary oracles are drafted for later
CI. Every case and remaining source/native/production/sync/freshness/parity/
delivery requirement remains unverified.

A separate two-equation resource successor bounds original decimal u64 literal
text before normalization, removes its BigInt conversion and checks the complete
20-digit decimal range lexically. Canonical native values and valid separators
remain; oversized or overflowing text refuses. Independent source cases retain
the actual native AST before observing that selection calls no host BigInt,
alongside complete receiving/strict TS boundaries. These cases remain unrun.
No measured performance result or raised source/flow bound is claimed.
