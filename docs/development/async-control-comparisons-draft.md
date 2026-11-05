# Guarded comparisons in async resource flow draft

This implementation and every new case are source drafted, unrun. It establishes
no current source-history qualification, performance, full production coverage,
complete resource equivalence, synchronization parity, freshness or green gate.

The original async-control source flow now checks six u64 comparisons and
primitive Boolean strict equality/inequality in existing complete terminal
branches, direct returns and immutable Boolean locals. Numeric inputs still require their actual dominating original entry
range guards; a bigint annotation or metadata row grants no u64 domain. Literals
remain bounded to u64, every operand must have the same checked scalar type,
and comparisons retain eager left-to-right operand evaluation. Text ordering,
coercive equality, Boolean ordering, mixed scalars and resource equality refuse.
The finite operator lookup lives inside the actual source-flow operation.

These conditions compose with existing Boolean negation, short circuit logic,
cold awaited operations and terminal branches. Every original receiver disposal,
move, borrowed control operand, complete Result propagation, child cancellation
and deadline callback rule remains. Entry guards inside a deferred body still
run at polling time. No new ability to drop, duplicate or store a resource or
pending future is inferred from a scalar comparison.

Rust emission preserves the original branch structure and primitive operators.
The canonical Rust projection can propose corresponding strict JS comparisons,
then the fixed consumer freshly checks the entire current source and serialized/
reparsed semantic meta and reproduces every original Rust token. Complete
runtime/declaration/native inputs, whole source CST and inverses remain required.
Candidate source observations grant no native or executable authority.

Three whole source equations retain the original checker/emitter and projection,
native owners, both language/repository phases and complete source inverses.
Independent written receiving cases cover all six truth tables, u64 maxima and
values above binary64 precision, Boolean equality, composed conditions, effectful
operand order, cold cancellation, two deadline branches, strict TS, Rust inverse,
original source spans, meta tampering, actual guards and refusal controls. Native
primitive edge oracle source is written for later same-SHA gated CI. Every case
and remaining source/native/production/sync/freshness/parity/delivery obligation
remains unverified.
