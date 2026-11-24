These complete original Rust 1.89.0 source files were retrieved from their pinned
official rust-lang/rust tag using normal TLS and a 512KiB per-file network bound.
The numeric macro hashes and Git blob IDs match the previously retained primitive
arithmetic receipt. Every original byte, source Git blob ID, complete length,
deterministic gzip length/hash and primary URL is recorded in manifest.json.
LICENSE-MIT and LICENSE-APACHE are complete original compressed license files.

The isolated source-only extension selects only the original primitive
wrapping_add/sub signatures, their unchanged single-intrinsic bodies, the actual
primitive Self/width macro invocations/import route, and the generic safe modulo
intrinsic contract. It does not expand the whole integer macro, translate all of
core, infer arbitrary trait implementations, or establish numeric formatter
parity. Both signed and unsigned supported fixed-width domains use exact BigInt.
The newly authored fixtures remain UNRUN until Gate explicitly grants a bounded
paired engine window. No Rust compiler or build was used.
