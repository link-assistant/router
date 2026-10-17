---
bump: patch
---

### Fixed

- Preserve borrowed opaque types, including explicit lifetimes and mutable references, in the original nested implementation census. The unchanged `&impl Fn` and `&impl Serialize` headers in Router no longer become global implementation obligations.

### Validation

- All 87 cases across eight complete related files pass in Node and Bun at unchanged deadlines. The complete 391-module source census contains no nested implementations after this correction; all existing nested Drop, alias, Clone and Default refusal cases remain required. Preserve the earlier complete canonical regression, all 2,653 output comparisons and full changed artifacts; regeneration and runtime parity remain independent checks.
