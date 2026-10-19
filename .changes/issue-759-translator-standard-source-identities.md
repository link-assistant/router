Retain actual Rust integer identities in generated standard Option, Result,
integer parsing, arithmetic and reader contracts. Whole-program proofs cover
pointer-sized integers separately from equal-width fixed integers, and refuse
invalid conversions while preserving the complete original source.

Both generated JavaScript and strictly compiled TypeScript pass the focused
proofs under Node and Bun. These proofs do not establish complete Rust parity.
