# Original Rust tool-attribute resolver inputs

These compressed, unchanged files are from Rust 1.89.0, under the original MIT or Apache-2.0 licenses copied here. The compiler is not executed. Full decompressed and archive checksums are verified before granting tool-prelude namespace facts.

- compiler/rustc_resolve/src/macros.rs: registered default tool names and builtin-attribute finalization.
- compiler/rustc_resolve/src/ident.rs: tool-prelude selection, no_implicit_prelude gate, and imported tool-prefix rejection.
- compiler/rustc_feature/src/builtin_attrs.rs: builtin lint-list attribute declarations.

The adapter initially recognizes the exact outer `#[rustfmt::skip]` form and bounded inner allow/warn/deny/forbid lint-path lists, with actual source ownership. It does not implement a formatter or grant procedural expansion behavior. Lint reason expressions and macro-bearing syntax remain outside the profile.
