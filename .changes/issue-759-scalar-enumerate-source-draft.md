Drafted source-pinned forward Iterator::enumerate through checked meta-language,
JavaScript and TypeScript, reusing existing bounded scalar/product tuple checks.
Actual usize and Item identities, upstream-first evaluation, checked count
increment before yielding, laziness and loop bodies are preserved.
The emitter requires exact source-qualified type receipts and retained incomplete
namespace/advanced-method flags; portable type equality cannot erase a reference
or grant a broader contract during meta round trips.

Seven authored cases remain unrun. Actual shared primitive Items retain their
reference and source-qualified pointee inside a private, bounded tuple inference
path, reusing existing immutable binding and source lifetime checks. They do not
become copied values. Ordinary inferred products still reject reference fields.
Borrowed aggregate/nominal/ownership-bearing products,
advanced Iterator methods, other usize/overflow profiles and complete runtime
parity remain unproved. No engine, generation, corpus gain or Rust build is
claimed by this source-only draft.
