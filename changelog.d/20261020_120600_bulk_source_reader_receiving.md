### Fixed

- Bulk repair 75 compiler test readers through the existing native/CST rule
  producer, preserving complete original sources and inverses.
- Distinguish physical workspace Cargo reads from Rust package reads and reuse
  the existing complete-row mapping in both current-source fixture APIs.
- Retain the original JSON branch workloads while checking independent sibling
  behavior in JavaScript and strict TypeScript and preserving shadow refusals.

The full 75-file checks still expose unresolved failures. Complete translation,
native parity and all same-SHA JavaScript gates remain unfinished; Rust stays
CI-only after JavaScript passes.
