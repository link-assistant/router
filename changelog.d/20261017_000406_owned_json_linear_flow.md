Add a per-function linear-use check for the new source-bound owned JSON copy and
field-update operations. The checked function tracks actual lexical bindings,
left-to-right argument moves, RHS-before-assignment reinitialization and branch
joins, including branches that return early and existing checked `?` propagation.
A narrow fresh-JSON mutable-local lane requires the original caller and operation
receipts; its whole body must pass before the declaration leaves refusal collection.

Keep the sealed JSON update proposal and existing scalar/aggregate paths intact.
Stored JSON loans (including borrowed text projected from JSON), loops, closures,
unknown aggregate Drop, opaque frames and unproved JSON transfers remain refused.
This is a bounded language rule, not general Rust ownership or historical ESM
attestation. Whole-eight JavaScript/strict-TypeScript controls and six independent
native Rust oracle cases are source-only and UNRUN; Rust remains CI-only after all
required same-SHA JavaScript stages pass. The coordinator must merge additive Host
changes and run the real class-entry producer before receiving qualification.
