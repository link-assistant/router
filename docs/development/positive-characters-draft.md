# Positive character scalar source draft

All new implementation and independent cases are UNRUN. The shared lexer masks
character literals as string tokens while preserving original text and UTF16
coordinates. The private positive parser now distinguishes those tokens during
normalization and validates one Unicode scalar for literal expressions and
patterns. Original lexer tokens and opaque macro token trees remain unchanged.

Validation covers ordinary scalar characters, surrogate pairs representing a
single non-BMP scalar, simple escapes, ASCII hex escapes and bounded Unicode
escapes. Raw delimiters/control characters, invalid escapes, surrogate scalars,
out-of-range codepoints and multi-scalar spellings refuse. The implementation
uses the existing guarded primitive string/array/regex operations and integer
arithmetic; it adds no coercion hook or mutable parseInt/fromCodePoint dependency.
Character source retains its spelling, scalar value and source span. Lifetimes
remain distinct, including a character-valued break expression.

Two whole compiler equations retain original modules, class/function owners,
separate language/repository sequences, complete CST/meta and inverses.
Independent unrun source cases and CI-only native oracle source cover scalar
boundaries, escapes, expressions, patterns, lifetime separation and refusals.
No lexer, parser, translator, preparer, test, experiment, generation, Rust tool
or CI-triggering push ran. Positive syntax grants no original native AST,
binding/type/owner, macro expansion or runtime authority. All actual production,
native closure, forward/reverse/sync, freshness, parity and delivery work stays open.
