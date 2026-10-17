# Pinned primitive f64 runtime source

The compressed original Rust 1.89.0 sources are `library/core/src/num/f64.rs`
and `library/std/src/num/f64.rs`. The registry verifies the compressed hashes,
original sizes and original hashes before use. Original sources are Copyright
The Rust Project Developers, licensed under MIT OR Apache-2.0; both original
license texts accompany these files.

The local adapter implements classification and floor through primitive
JavaScript Number operations. No Rust implementation is executed or copied into
the adapter. NaN class is preserved; NaN sign and payload are not observable in
this profile. Rust const-stable classification descriptors do not grant floating
constant evaluation. floor const use is unstable in the pinned stable release.
