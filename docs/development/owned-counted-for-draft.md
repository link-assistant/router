# Checked counted-for source draft

The original owned JavaScript/TypeScript checker now drafts ascending exclusive
and descending inclusive integer `for` statements. A fresh `let` index must start
and end in the same actual native integer domain. Ascending loops compare with
`<` and increment by one; descending loops compare with `>=` and decrement by one.
Postfix/prefix operators, compound assignment and explicit `index = index +/- 1n`
progress forms are checked against the actual induction symbol.
Bounds must be immutable source bindings or bounded literals. The loop body may
not write the induction binding. Mutable bounds, other comparisons, unknown
steps, mixed domains and header effects refuse rather than silently changing
JavaScript behavior.

These conditions permit an actual Rust half-open range or reversed inclusive
range. Literal bounds gain their domain only from the other actual native
operand. Ascending final stepping remains in its native domain. Descending
body values remain in domain even at zero or the signed minimum; its discarded
JS successor cannot escape the fresh index scope or become an executed body value.
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

The descending draft also retains complete helper/interpreter/emitter/parser
predecessors, separate substitution phases and full source inverses. Independent
zero, empty, signed minimum, unsigned maximum, direction, mutation, nested
continue/break, typed source and canonical inverse cases are drafted and unrun.

No translator, preparer, compiler diagnostic, test, experiment, Rust tool or CI
has run. Other counted-loop forms, general iterators, runtime generics/effects,
production adoption and every other open ledger requirement remain unfinished.
