# Scalar and JSON translation rules

The reverse owned-core compiler accepts Unicode scalar counts from actual
`router_core_unicode_scalar_count` imports and integer ordering between identical
checked integer types. Both JavaScript and TypeScript pass through serialized,
reparsed CST and checked semantic meta before Rust emission. The complete emitted
Rust witness also translates forward into independently executed JavaScript and
strict TypeScript. This covers the registered operations; it does not establish
whole-Router synchronization.

`node tools/translation/prepare-owned-string-operations.mjs --write` derives the
reverse source changes from the existing complete source equations. Language
rules add checked integer comparisons. Repository rules bind fixed owned-core
signatures and the authored Rust CI witness. Original source archives, actual
import/type/loan checks and full source inverses remain required.

`node tools/translation/prepare-safety-json-projections.mjs --write` lowers the
two production optional-JSON matches through separate language and repository
sequences. The language sequence lifts optional control flow; the repository
sequence uses checked JSON accessors and formats the source. All five complete
functions in `rust/src/safety_identifier.rs` execute in the focused forward
checks, including null, non-string and Unicode limit cases. The generator copies
the original match bodies into Rust reference tests. Rust execution remains a
CI obligation after every JavaScript stage passes for the same commit.

`evaluateOwnedCoreBatch(program, calls, token)` accepts at most 4,096 ordinary
`[functionName, arguments]` pairs, each with at most 64 arguments. It snapshots
the call containers, checks the complete program once per batch and checks source
freshness around every call. Its private evaluator is copied from the complete
original independent interpreter; the single-call API keeps its implementation.
No program verdict survives the batch. The exhaustive ASCII test retains all
128 byte cases and its original 60-second deadline.

Canonical source-plan DATA comes from Node when receiving under Bun. The full
plan is compressed, transported and independently inspected; it grants no Bun
compiler identity or runtime optimization permission. Existing runtime tests
continue to require Bun's original full-parser fallback.
