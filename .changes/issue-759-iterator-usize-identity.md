Retain actual Rust `usize` identity for checked iterator counts and size-taking
adapters instead of conflating it with an equal-width `u64`. Refuse incompatible
primitive and reference return contexts, including direct count returns.
Independent JavaScript and strict compiled TypeScript tests cover empty and
bounded slices, ranges and identity refusals. No overflow behavior or Rust body
is changed, and this metadata repair adds no production-body parity claim.

The checked API identity follows the standard Iterator declarations:
https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.count and
https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.take.
