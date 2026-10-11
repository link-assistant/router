# Router semantic extensions

These modules adapt the exact reusable parser, checker and emitter copied from
meta-language PR 201, commit `e46e196db5ec34bf13a73b8645aa38d409737e60`.
The vendored originals and their upstream-lock hashes remain unchanged.

`core.mjs` validates exact source anchors and exposes three upstream classes
through in-memory modules. It changes exports and emitter constructor injection
only. `strings.mjs` subclasses those classes with checked AST nodes, recursive
value-domain validation, monomorphic algebraic type declarations and semantic
emission. Its constructor-match emission follows the upstream implementation;
the unreachable error helper preserves the abort while allowing strict TS
exhaustive narrowing. `lexical.mjs` adapts Rust raw literals, ASCII continuation
escapes and CRLF normalization with source-coordinate mapping.

These are generic lowerings, not Router function substitutions. Unsupported
effects, ambiguous names, unresolved dependencies, aggregate mutation and generic syntax
continue to carry original source and diagnostics. Expected outcomes are
independently authored in `../fixtures/portable-cases.json`, with official Rust
contracts recorded in `../fixtures/rust-stdlib-sources.json`. No Rust compilation
was used as validation. Inventory implementation hashes include these modules.

`control.mjs` adds checked scalar statement nodes, lexical mutability, overflow-
preserving compound assignments, loop exits, early returns and slice indexing.
`data.mjs` adds module-local algebraic layouts, immutable record constructors
and fields while preserving written field evaluation order. Target emission
consumes the serialized/reparsed semantic program from `../semantic-meta.mjs`.
No Rust, platform API, trait or async implementation is substituted.

`iterators.mjs` adds typed scalar callbacks and generator-based lazy iterator
adapters, short-circuit consumers, checked sums, scalar for loops and bounded
primitive integer ranges. Stored
iterators and escaping/move closures remain refused because consumption and
capture ownership have not been established.

`effects.mjs` checks explicit standard-library effect contracts and lowers actual
repository bodies through the same serialized semantic program. Async functions
return lazy thenables; host arguments bind before polling, and effects run when
awaited. The `?` operator propagates only matching Option/Result failure layouts;
unresolved From conversions remain refusals. Generic Node adapters are copied
into generated packages and imported through relative paths. Rust 2024 unsafe
environment mutation, escaping futures, cancellation, concurrent borrowing, and
external runtime scheduling are not established by this contract. Independent
fixtures check effect order, early return, laziness, scoped capabilities, UTF-8,
OS errors, domain guards and adapter faults. Runtime parity remains false.
