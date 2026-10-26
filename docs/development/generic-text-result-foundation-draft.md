# Shared generic String-error Result ABI draft

All implementation, source producer and regression source is drafted and unrun.
No tests, experiments, diagnostics, translation, preparation, regeneration, Rust
tools, push or CI ran. Every unfinished [ledger requirement](bulk-draft-requirements.md)
remains open. Generic Result caller lowering remains an implementation prerequisite.

The existing owned Result native/runtime/declaration assets gain an unchanged
`Result<T, String>` operation with a precise readonly Ok<T>/Err<string> signature.
It returns the complete value without observing either payload. There is no new
runtime asset or native module edge. The original 120 scalar/callback descriptors
remain separate. A signature-only generic descriptor cannot authorize an ordinary
unchecked value call.

The actual three-language source proof and bounded library producer are complete
automated copies of the Option implementations, using explicit source rules for
the Result header, names, paths, archives and fields. The checker independently
requires the actual synchronous native single-input/same-return body, actual JS
same-parameter return, closed declaration namespace, one genuine unconstrained T
and exact readonly Ok/Err payloads. Complete original library plus fragment
equality, current mirrors, archive checks and full CST inverses remain required.

The original primitive-to-owned native copy retains its original before/after,
source pin, two original stages and inverse. The generic suffix composes as a
separate complete later history with precise currentAfter. Existing callers and
source-history workloads keep their original semantics and deadlines. The default
source observer permits exactly the additional identity function; optional generic
proof remains separate until genuine qualified type-query imports select it.
No source/hash/owner/verdict/result cache crosses invocations.

Ten complete compiler/library source equations retain native owner spans and
separate language and repository sequences. Independent unrun source covers
opaque success identity, exact Unicode/empty/NUL errors, mirror changes,
source-only call refusal, complete library inverses, original native history and
actual Rust exact-once payload drop timing. No source result counts as executable
application coverage.

The next compiler batch must preserve precise generic Result signatures through
actual type queries, aliases, unchanged-value helpers, JS/TS/meta/native emission,
physical paired signatures and explicit call arguments. Broader error types,
architecture/producer closure, production adoption/parity, complete receiving,
original source/timing/profile/reverse freshness repairs and every CI gate remain
unfinished.
