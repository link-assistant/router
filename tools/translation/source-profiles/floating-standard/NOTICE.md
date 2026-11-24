# Pinned Rust floating literal source inputs

These compressed original Rust 1.89.0 source files support the literal-token and
single-rounding compiler profile. Their sizes and hashes are checked before use.
The profile implements a bounded exact-rational binary64 converter locally;
it does not copy or execute Rust's decimal-to-float implementation.

Original sources are Copyright The Rust Project Developers and licensed under
MIT OR Apache-2.0. The original license texts are included alongside these files.

Source paths:

- `compiler/rustc_lexer/src/lib.rs`
- `library/core/src/num/dec2flt/mod.rs`
