# Primitive division and remainder source draft

Source only; all cases UNRUN. Fixed-width division and remainder now have a
separate complete ordered-failure observer and closed operator module. The
original public failure observer, old closed operation module and original
Rust emitter retain their exact earlier domains and refusal behavior.

The additive native source-roundtrip emitter evaluates both actual scalar
operands into distinct immutable locals, left to right, and emits the typed
native division or remainder operator. Rust's zero-divisor and signed MIN/-1
failure distinctions stay in the native operation; BigInt truncation and
remainder paths retain the separately bounded runtime's matching checks.
This replaces the additional assertion macro only in actual native source
round trips and the independently checked new primitive definition profile.
Other original emission modes keep their existing output.

Every active receiving definition/insertion/removal/reconciliation/bootstrap
consumer, native body observer/projector and ownership traversal selects the
extended finite failure family. Division remains fallible: evaluated unused
results retain ordered events, guarded operands execute only in their selected
continuations, and earlier operand failures precede the zero check. Total
operator APIs are unchanged. Borrowed, mixed-width, wrapping and unregistered
operations remain refused by the independent actual operand guards.

Nineteen complete source equations preserve full source originals, exact
language/repository rule phases, lossless CST transport and full inverses.
Independent all-width scalar/vector, zero/overflow, negative rounding,
left-operand ordering, unused/guarded calls, bulk/discovery and original-API
refusal cases plus CI-only Rust oracles are drafted. Source review also repaired
the preceding forward-case callback to use the actual independent target API.
No implementation, preparer, compiler or case has executed locally.

Bare Option::expect(checked_div/checked_rem) is not rewritten as division:
its None branch can intentionally use a different zero panic message. That
distinct operation remains outside this native binary lane. Full source-owner
closure, new Vec bootstrap, mutation/async/network behavior, complete canonical
generation, freshness, platform/receiving qualification and full Router parity
remain OPEN. This is not a completed full source draft or measured coverage.
