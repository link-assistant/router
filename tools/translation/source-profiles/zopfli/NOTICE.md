# Original compression package

The complete npm release `@gfx/zopfli` 1.0.15 comes from
[gfx/universal-zopfli-js](https://github.com/gfx/universal-zopfli-js), git revision
`29b826a49f4161363dc44a91031feea87808716b`. All nine original package members,
the complete release tarball and npm metadata are retained here. `manifest.json`
pins their exact lengths and SHA256 hashes, npm SHA512 integrity and the complete
decoded WebAssembly binary. The original Apache-2.0 license is
`upstream/LICENSE.md`.

The binary implements [Google Zopfli](https://github.com/google/zopfli), written
in C and compiled with Emscripten. This repository uses the precompiled release;
no installation script, local compilation or Rust tool is required. The code
provides gzip storage only and grants no translation or source authority.

`prepare-zopfli-vendor.mjs` derives the complete runtime copy under
`tools/translation/vendor/zopfli`. Its language rule replaces the one native-AST
selected `base64-js` import with Node/Bun decoding for the closed, independently
pinned embedded binary. Its repository rule marks that platform scope. Complete
serialized/reparsed CST, native syntax and original-source inverses remain
required. Every other original package byte, including the C/WebAssembly
implementation and license, is unchanged.
