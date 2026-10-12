Drafted source-pinned forward Iterator::enumerate through checked meta-language,
JavaScript and TypeScript, reusing existing bounded scalar/product tuple checks.
Actual usize and Item identities, upstream-first evaluation, checked count
increment before yielding, laziness and loop bodies are preserved.

Five authored cases remain unrun. Borrowed/nominal/ownership-bearing products,
advanced Iterator methods, other usize/overflow profiles and complete runtime
parity remain unproved. No engine, generation, corpus gain or Rust build is
claimed by this source-only draft.
