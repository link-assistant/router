# Original owned byte literal source draft

Dense nonempty arrays of actual decimal BigInt literals in `0..255` now select
the existing owned byte domain. Every original element is checked; no written
type or copied meta can manufacture the width. Source arrays containing JSON
operations retain the separate JSON-list path. Empty arrays retain their prior
domain rather than acquiring an inferred native element type.

The native emitter retains explicit u8 suffixes. The original native reader has
a separate bounded list branch for precisely those literals and the inverse
re-enters the complete source/meta/body checker. Ordinary native u8 scalar
values, mixed or repeated vectors and malformed/out-of-range literals do not
gain admission. Existing move, live shared-root, temporary borrow and replacement
rules apply unchanged, including filesystem buffers and JSON-byte parsing.

Four complete original source copies, language/repository substitutions and
full inverses are retained. Independent direct JS/strict TS, native inverse,
boundary/parser/mutation/refusal and real native library oracle source is
drafted and unrun. No tests, experiments, compiler, translator, preparer,
generation, local Rust tools, push or CI ran. Contextual empty vectors, arbitrary
element calculations, wider containers, namespace closure, production parity
and every unfinished bulk requirement remain open.
