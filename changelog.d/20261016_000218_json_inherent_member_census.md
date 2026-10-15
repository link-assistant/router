---
bump: patch
---

### Fixed

- Inspect every original inherent implementation when selecting the unique
  source method for a registered JSON float slot. The complete pinned Number
  source has two separate implementation blocks; retaining both avoids a module
  initialization failure without admitting duplicate method declarations or
  selecting Cargo features. Add original-source span and census regressions
  while preserving the complete existing tests and their deadlines.
