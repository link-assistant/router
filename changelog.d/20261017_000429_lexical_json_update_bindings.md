The explicit owned-JSON update adopter now associates each fresh mutable local
with its actual lexical block. Distinct sibling branches may reuse a local
name; active shadows, aliases, RHS root reads, repeated final reads and nested
closure/loop uncertainties remain refused within a binding. The original
RHS-first hygienic substitution, full source/Cargo/producer checks and two
CST rule phases remain in place; this grants no old IndexMut or ownership proof.

A new whole eight-case test retains source maps and inverses, exercises synthetic
branch behavior in JavaScript and strict TypeScript, and requires all three
branch updates in the complete original `translate_parts` parent to be selected.
That source still needs the separate collection/callback contracts before any
full-body execution gain can be claimed. A native six-case Rust oracle runs
only in gated CI. This is a source-only checkpoint: no local engines or Rust
were run, and existing whole test files/deadlines were not changed.
