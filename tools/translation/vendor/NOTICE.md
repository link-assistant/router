# Pinned upstream implementation

`meta-language/translation/*.js`, `meta-language/program-translation.js`,
`meta-language/language-support.js` and `meta-language/self-translation.js`
are unmodified copies from **link-foundation/meta-language** commit
`e46e196db5ec34bf13a73b8645aa38d409737e60`, the head of [PR 201](https://github.com/link-foundation/meta-language/pull/201)
read on 2026-10-11. The upstream Unlicense is retained in
`meta-language/LICENSE`. The local package.json only sets ES module loading.

The executable pipeline imports the original Rust frontend, semantic type
checker, IR passes and JavaScript emitter directly. `program-translation.js`
and `self-translation.js` are retained as reference implementations; the
network/native-grammar dependencies of self-translation are deliberately not
vendored or invoked. Router's source-bearing compact structural IR and module
assembly are implemented in the parent directory.

`formal-ai/lexer.mjs` is an unmodified copy of
`scripts/self-translation/lexer.mjs` from **link-assistant/formal-ai** commit
`e9f057c8300cab787f746afbcc0133cef80e2948`, the head of [PR 1188](https://github.com/link-assistant/formal-ai/pull/1188)
read on 2026-10-11. Its Unlicense is retained in `formal-ai/LICENSE`.
Router extends its structural lexer outside the vendor tree with nested Rust
comments, raw strings and character literals while preserving coordinates.

The design was also compared with **link-foundation/relative-meta-logic**
commit `c5513f2b958a8bd160b58c7054d408d4c446bf98`, particularly
`js/src/rml-meta-language.mjs` (lossless reconstruction plus independent
evaluation comparison) and `scripts/check-corpus-parity.mjs` (exit status,
stdout and stderr parity). That implementation supports RML rather than
arbitrary Rust. No RML dependency or evaluation code is copied here, and this
pipeline never claims that source reconstruction proves runtime parity.

`upstream-lock.json` records SHA-256 hashes of the vendored files. Tests verify
these hashes so local semantic extensions remain visible outside this tree.
