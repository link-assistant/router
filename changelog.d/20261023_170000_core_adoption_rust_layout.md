---
bump: patch
---

### Fixed

- Use the actual Rust package root in the bulk-adoption producer and reviewer,
  retaining all nested Cargo input guards, logical fixture declarations and
  complete physical source comparisons through native Python AST/CST rules.
