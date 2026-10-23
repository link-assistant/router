---
bump: patch
---

### Fixed

- Use the actual Rust package root in the bulk-adoption producer and reviewer,
  retaining all nested Cargo input guards, logical fixture declarations and
  complete physical source comparisons through native Python AST/CST rules.
- Preserve original invalid and foreign CLI diagnostics by deferring the
  operational helper import until it is needed after validation.
