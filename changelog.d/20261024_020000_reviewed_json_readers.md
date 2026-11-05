---
bump: patch
---

Apply the independently reviewed full-corpus JSON-reader substitutions to token
table scope and revoked fields. Add Rust regression source for empty and Unicode
scopes, wrong JSON kinds and actual boolean handling. The source migration does
not establish executable coverage or full translation parity.
