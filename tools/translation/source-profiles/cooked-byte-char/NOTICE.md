The full original Rust 1.89 lexer, parser lexer, parser Cargo.toml and Cargo.lock
are pinned with exact source/compressed/Git blob identities. The parser invokes
Mode::Byte from its actually locked rustc-literal-escaper 0.0.2 dependency. Its
full crate archive is retained, including complete MIT and Apache-2.0 licenses;
the original lib.rs and relevant escape/domain anchors are verified in memory.
Rust licenses are retained in ../floating-standard/.

The narrow lexical bridge preserves original byte-token spans and primitive
u8 identity. It accepts one ASCII scalar, the actual cooked escapes and all
256 hexadecimal byte values; Unicode escapes and non-ASCII direct scalars
remain invalid. Caller bodies translate through shared checked semantic meta
to JS and strict TypeScript. This is source-qualified grammar implementation,
not automatic compilation of the complete Rust lexer or literal escaper.
New cases remain UNRUN; no namespace, corpus gain or complete parity claim.
