The general checked frontend now parses scalar `let-else` directly from Rust
tokens and lowers it through the existing semantic IR and statement emitter.
The subject is evaluated once. Constructor/layout checks precede projections;
bindings enter only the success continuation. Failure branches must have a
checked unconditional return or enclosing-loop break/continue on every path.
Unproven divergence, ownership and source grammar stay explicit refusals.

Independent default Host tests exercise emitted JavaScript and strict compiled
TypeScript, serialization round trips, actual standard aliases and local named
constructors, source scopes, loop exits, and proxy rejection without observable
reads. A synthetic external counter independently observes once-only evaluation.
The unchanged tracked `frame_terminates_stream` declaration remains carried for
its UTF-8 host adapter; no production body is counted as newly executed here.

Rust grammar reference: https://doc.rust-lang.org/reference/statements.html#let-statements

Validation: 24 focused Node and 24 focused Bun tests pass; 30 related Node tests
cover existing pattern syntax/plans, aliases and canonical original bodies.
Rust was not executed. Full/runtime parity remains false.
