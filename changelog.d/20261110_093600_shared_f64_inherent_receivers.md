### Fixed
- Translate source-qualified shared `f64` receivers for `is_finite`, `is_nan`
  and `floor`, including the unchanged `safe_number` predicate in a small
  independent project. Preserve competing-trait, mutable-reference and lifetime
  refusals. Full production generation and runtime parity remain unqualified.
