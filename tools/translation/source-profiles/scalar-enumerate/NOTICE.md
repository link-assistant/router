Full original Rust 1.89.0 Enumerate source is retained with its Git blob and
SHA-256 identities. Iterator::enumerate reuses the existing full original
Iterator trait pin. Rust sources are MIT OR Apache-2.0; the preserved licenses
are in ../copy-standard/LICENSE-MIT and ../copy-standard/LICENSE-APACHE.

This source-only profile covers forward next-based consumption of existing
checked immutable scalar and anonymous product items, 64-bit usize and checked
overflow. Original next evaluates upstream before incrementing its count, then
returns the previous count with the original item. Borrowed aggregate/nominal fields,
custom Iterator owners, specialized fold/count/nth/backward/unchecked methods,
other usize/overflow profiles, Drop/allocation and complete parity remain open.
All eight authored cases passed under Node and Bun as part of the exact
167-case cohort at source d83c5e5b72429239440cbbec727ff305047b6207.
Its complete attempts and source/input identities are retained in
docs/case-studies/issue-759/current/source-for-enumerate-d83c5e5b/.
No producer or corpus gain is claimed; this notice does not establish complete
namespace, trait, allocation or runtime parity.
