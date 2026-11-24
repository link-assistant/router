Ordinary tuple `let` now uses the same actual layout and scalar binding plans
as checked pattern control. Only irrefutable patterns bind into the continuation;
the receiver is evaluated once and checked for immutability before projection.
Tuple structs, named structs with ABI-like field names, moves, references,
mutable bindings, unresolved annotations and refutable ordinary lets stay refused.

Independent emitted JavaScript and strict compiled TypeScript tests cover nested
products, one-element and unit products, literal-exhaustive scalar patterns,
standard Option/Result tuple let-else, existing Option propagation, lexical
shadowing, once-only observation and hostile proxy/accessor guards. Heterogeneous
intermediate Result layouts still require a separate projection proof.

Validation: 31 Node and 31 Bun tests pass. Source bodies and output artifacts
were not rewritten. This capability adds no newly executed production-body
claim; unchanged split helpers await their checked standard string adapters and
callback/lifetime dependencies. Full/runtime parity remains false.
