Full original Rust 1.89.0 Enumerate source is retained with its Git blob and
SHA-256 identities. Iterator::enumerate reuses the existing full original
Iterator trait pin. Rust sources are MIT OR Apache-2.0; the preserved licenses
are in ../copy-standard/LICENSE-MIT and ../copy-standard/LICENSE-APACHE.

This source-only profile covers forward next-based consumption of existing
checked immutable scalar and anonymous product items, 64-bit usize and checked
overflow. Original next evaluates upstream before incrementing its count, then
returns the previous count with the original item. Borrowed/nominal fields,
custom Iterator owners, specialized fold/count/nth/backward/unchecked methods,
other usize/overflow profiles, Drop/allocation and complete parity remain open.
All five authored cases remain unrun; no corpus gain is claimed.
