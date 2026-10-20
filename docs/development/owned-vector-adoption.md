# Owned vector construction candidate

`crate::translation_core::vec!` is an explicit compatibility interface backed
by Rust's `::std::vec!`. Library allocation internals remain native. The new
checked lane supports comma lists of at most 4096 primitive integer, Boolean,
standard owned-text or borrowed-`str` elements. It uses the existing vector
expression parser, array checker, source ownership/lifetime checks, semantic
serialization/reparsing and JavaScript/TypeScript emitter. Element expressions
retain their source order and execute once.

Repetition, nested collections, nominal records, mutable/shared-reference
elements, erased generic identities and unproved borrowing remain refused.
The existing ordinary `vec!`/`std::vec!` owner gates remain independent. A
qualified owned call requires the complete genuine facade, original source
scope and stock parser method. An imported alias or public metadata cannot
establish that association. Const allocation remains refused. Successful
resource behavior excludes allocator/OOM effects, matching the existing owned
text and immutable collection projection.

`prepare-core-vector-sources.mjs` uses TypeScript 5.9.3's native AST to select
the complete source-data literals and actual Host parser/checker methods. Its
Rust CST rule derives the vector wrapper from the existing owned-format wrapper
by changing the macro's name and absolute standard delegate. Ordered language
and repository rules retain complete before/after CST, serialization/reparsing,
all edits and whole inverses. The generated Host hook delegates to the existing
checker and keeps its enclosing ownership and primitive-identity checks.

Run the read-only producer comparison with the repository's installed compiler:

```sh
node tools/translation/prepare-core-vector-sources.mjs --root /absolute/checkout --check
```

The complete historical source inputs are checked-in fixture DATA. Check mode
freshly regenerates all four outputs and compares every byte: the Rust facade,
its complete SOURCE/SHA256 literals, Host integration and independent Rust
oracle. It does not consume saved compiler programs or verdicts. The source
proposal and source-data constants grant no semantic authority. The oracle
source has not run locally; all Rust tools remain prohibited during issue #759.

`migrateCoreVectors` produces an explicit source proposal for unqualified
`vec!` uses in complete top-level functions. It reuses the formatting adopter's
conservative complete-module/parent macro binding capture. Competing macros,
glob imports, unknown attributes, unresolved parent macro imports and local or
other macro producers retain refusals or unchanged functions. It preserves
complete original and edited source, serialized CST, edits, mappings and a
full inverse. Qualified standard calls are kept unchanged. The proposal does
not select an original standard macro implementation or admit its caller;
the owned candidate must pass a fresh checker independently.

The complete physical production frontier DATA report retained on 2026-10-21
has 31 historical `vec!` first-refusal functions. Its opaque-aware token report
finds 99 `vec!` occurrences across 63 carried functions. Those sets overlap and
are not executable gains. The first receiving application case retains the
complete original `proxy/upstream_headers.rs` parent/module and its exact
`forwarded_client_headers` body, proposes the owned call, and independently
checks that complete function in an explicit receiving carrier. This is not
whole-application or whole-crate admission; unrelated parent functions and
production namespace/configuration obligations remain separate.

The complete new receiving file is
`tools/translation/test/router-core-vectors.test.mjs`. It covers producer
inverses, primitive/text results, checked call order, semantic/owner refusals,
adoption ambiguity and the original application module. It executes emitted
JavaScript and strict-compiled TypeScript. Whole production regeneration,
original-context coverage measurement, the complete JavaScript gate and gated
Rust CI remain coordinator obligations. The historical 155/2567 executable
measurement is unchanged by this source candidate.

The vector producer's complete `--check` and both dependent formatting
producers' fresh byte comparisons passed after regeneration. The bounded
native source-only refresh completed in 15.18 seconds with 684,113,920 bytes
peak aggregate RSS and retained complete compressed before/after receipts.
The seven-case runtime suite has not yet run; source freshness does not
establish receiving behavior or runtime parity.
