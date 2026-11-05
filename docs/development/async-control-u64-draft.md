# Guarded async numeric input draft

Async control callers can now propose public u64 count parameters when their
complete original JS/TS contains a canonical dominating entry guard. A bigint
annotation or operation-derived type query still supplies no range proof by
itself. All implementation and independent regression/oracle source is unrun.

The native AST rule requires the same actual parameter in every clause:
`typeof value !== "bigint" || value < 0n || value > 18446744073709551615n`,
followed by its complete canonical invalid-domain throw. Guards must precede
the body flow, at wrapper entry or inside the original closed cold callback.
No earlier statement, mutation, different operand, weaker bound, unrelated
guard, missing clause or guard over a nonnumeric written parameter is admitted.
The checker retains every full original guard and span and reissues them after
semantic-meta serialization/reparse. Bounds are not read from saved proof data.

The original guard stays in emitted JS and TypeScript, retaining its original
polling position and behavior. Native u64 parameters enforce that entry domain,
so their Rust projection omits only this source-checked boundary validation.
Operation-specific limits remain separate: valid u64 values can still return
InvalidInput for an excessive delay or capacity. Canonical Rust u64 inputs get
the actual JS entry guard before fresh complete checking and source reproduction.
Paired signatures can propose bigint only when the complete target body retains
the required guard and passes its own fresh source checker.

Complete source-checker, inverse-projection and paired-signature originals and
both substitution sequences are retained. Independent unrun cases cover zero,
exact maximum/overflow, wrong JS types, operation limits, cold rejection,
cancellation, native inverses, strict TS, source/meta tampering and weaker or
misplaced guards. The native oracle is gated CI only. Other numeric/control
grammars, general async/HTTP resources, namespace/bootstrap, production adoption,
full receiving checks and every remaining ledger requirement stay open.
