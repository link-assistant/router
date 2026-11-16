### Changed
- Draft separate fixed-width division/remainder round-trip rules across actual
  source/native checks, guarded failures, receiving helpers and native emission.
- Preserve original public API refusals, zero/overflow messages and operand
  evaluation order. All new cases and CI-only Rust oracles remain unrun.
