# Local owned primitive vector caller source draft

Status: source drafted, all execution UNRUN. This first caller integration accepts
qualified locally constructed vectors in both original outcome/cancellation
source families. It does not yet accept Vec public parameters, mutable Vec
reassignment, iteration/capture ownership or native forward/canonical inverse.
Those remain explicit separate rule obligations; no old API refusal was removed
to stand in for those missing rules.

All 88 actual core calls join original import symbols and current paired ABI/
body/bound sources. Consuming operands must have their actual owned Vec domain;
reading a local after a move or using it twice in append refuses. Borrowed calls
read the actual live local without moving it, keep that binding live through all
later arguments and reject an index expression that consumes the receiver.
Temporary owned values may be read for the duration of a copied-result call.
Shared slice copies retain their actual live readonly parameter root. Scalar
operands still require exact domain/u64 rules. No catalog, name, source digest or
returned ABI observation issues a checked caller.

Original variable/branch move rules now include these owned locals. Early exits
retain the continuing branch's source state; a potentially moved value cannot
be read after a nonterminating branch. New vectors are not captured by callbacks
or borrowed from an outer loop scope in this profile. All final body, written
return/local ABI and complete source checks stay mandatory. Native emission
moves by-value operands and emits explicit shared borrows for copied reads.
Strict TypeScript uses source-bound constructor/getter type witnesses. Both
interpreters register the actual paired runtime, with immutable carriers and the
matching explicit native 4096-value bound.

Complete module translation, per-program checking/emission and document item
reissue share source parsing only inside bounded synchronous operations. No
frame spans runtime imports or evaluation. Direct document entry points select
the scope after reconstructing their complete original source/context/CST.
Both host asset APIs ship the complete new pair; the separate source provider
retains all three runtime/declaration pairs without duplicate nested-root mirrors.
No source, owner, input, verdict or result cache was added across operations.

Seventeen complete equations retain all original APIs and source files, ordered
language/repository phases and full inverses. Independent complete caller source
covers all operations/domains, original JS, strict compiled TS, both interpreters,
serialized/reparsed semantic and concrete meta and typed source re-entry. Move/
duplicate/loan/branch/mutation/input/tamper refusals and source dependency closure
have independent source cases. Every case, producer, source/CST replay, receiving
export, performance/freshness check and CI-only native oracle is UNRUN.

Public Vec input guards and ownership, mutable slots, loop/callback fixed points,
canonical native inverse, native forward caller/type/loan/emission, actual native
root/history installation, production adoption and full synchronization remain
OPEN. No local test, compiler, parser, translator, preparer or Rust tool ran.
CI feedback remains uninspected until the entire bulk draft exists.
