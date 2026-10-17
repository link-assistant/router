### Changed

- Consolidated the translation task's worker, cleanup, strict compiler, complete
  evidence and fixed allocation requirements in CONTRIBUTING, and linked the
  reusable guidance. Local hooks must not run Rust or clean caches automatically.
  CI remains responsible for Rust checks after the complete same-SHA JavaScript
  gate. Copying a compiler or guideline bundle still requires receiving tests.
