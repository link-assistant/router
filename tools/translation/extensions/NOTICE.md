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
effects, ambiguous names, unresolved dependencies, mutation and generic syntax
continue to carry original source and diagnostics. Expected outcomes are
independently authored in `../fixtures/portable-cases.json`, with official Rust
contracts recorded in `../fixtures/rust-stdlib-sources.json`. No Rust compilation
was used as validation. Inventory implementation hashes include these modules.
