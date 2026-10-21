### Added
- An additive private CST source-substitution transaction and an explicit batched producer for all 34 proof-byte source records. They retain the ordered language and repository phases, complete serialized/reparsed CST, inverses, native bindings, original source checks and existing limits. The original standalone producer remains available.

### Validation
- All seven bulk-transaction cases passed under Node 20.19.4 with the pinned TypeScript 5.9.3 compiler and no duration breaches. The one API module and five provider modules passed independent full-source, native syntax, CST/inverse, archive readback and freshness checks.
- Provider performance, Bun receiving checks, production selection, complete regeneration and the full JavaScript gate remain open. This draft does not increase measured executable coverage or establish complete bidirectional synchronization. No local Rust tools ran.
