# Checked counted-for source draft

The original owned JavaScript/TypeScript checker now drafts ordinary ascending
integer `for` statements. A fresh `let` index must start and end in the same
actual native integer domain, compare with exclusive `<`, and advance by exactly
one BigInt using postfix/prefix increment, `+= 1n` or `index = index + 1n`.
Bounds must be immutable source bindings or bounded literals. The loop body may
not write the induction binding. Mutable bounds, inclusive comparisons, unknown
steps, mixed domains and header effects refuse rather than silently changing
JavaScript behavior.

These conditions permit an actual Rust half-open range. The final step stays
inside the signed/unsigned native domain, including a maximum upper bound.
Rust range stepping preserves `continue`, `break`, nested loop boundaries and
early returns. The TS emitter and both interpreters retain those same behaviors.
The canonical Rust reader proposes the inverse counted loop, but every proposal
must still pass fresh complete JS checking and reproduce the full original Rust.

Complete original source copies, separate language/repository substitutions,
lossless CST and full inverses are retained. Existing loop/scalar/private body
checks remain mandatory. Independent actual JS, strict TS, both interpreter,
canonical inverse, signed-minimum/unsigned-maximum, empty/reversed range,
continue/break/nested/return and refusal source cases are drafted and unrun.
Existing native range oracle source remains the gated Rust counterpart.

No translator, preparer, compiler diagnostic, test, experiment, Rust tool or CI
has run. Other counted-loop forms, general iterators, runtime generics/effects,
production adoption and every other open ledger requirement remain unfinished.
