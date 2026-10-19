---
bump: patch
---

### Changed

- Protect larger completed immutable JSON subtrees from small AST-token churn
  with separate bounded weak-map retention cohorts. Complete operands, small
  subtrees and large subtrees together keep the existing 4,096-record maximum;
  all logical validation and encoded-byte limits stay unchanged. Retain the
  complete previous helper and add boundary/reuse controls. The preceding
  owner-only partition passed focused tests and preserved all full-graph bytes,
  but its separate diagnostic established no performance gain. Full translation
  and runtime parity remain unproved.
