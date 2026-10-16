Add a distinct checked Rust `char` scalar domain, preserving each literal's
original raw spelling, span and decoded Unicode scalar through checked semantic
serialization and target emission. JavaScript represents one character as a
validated scalar string; character values remain distinct from ordinary text,
byte literals and integers. Runtime value layouts and strict TypeScript types
carry this domain without adding string coercions or public proof flags.

Fresh scalar-array string Patterns now trim by Unicode-scalar membership rather
than treating a character set as one substring. Receiver and member expressions
evaluate once in source order, and the existing borrowed-text origin checker
retains the receiver lifetime. This covers the unchanged punctuation body in
`login_url::trim_url_punctuation` after actual owned signature adoption. General
array Copy/borrow permission, arithmetic, ordering, casts and character methods
remain outside this initial domain. Existing ordinary string patterns retain
sequence semantics; UTF-8 byte-index slicing remains separate unfinished work.

Eight complete source/behavior/refusal cases keep 60-second limits and strict
TypeScript children at 20 seconds. Six independent native Rust oracle cases are
CI-only after the full JavaScript gate for the same revision. SOURCE-ONLY draft:
JavaScript, Bun, strict TypeScript and native oracles are UNRUN here. Host hooks
are coordinated with batch 315 and require the actual coherent class-entry
producer; no historical class/body/owner proof is inferred from these rules.
