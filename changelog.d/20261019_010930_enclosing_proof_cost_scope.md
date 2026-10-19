---
bump: patch
---

### Changed
- Construct the enclosing-namespace context inside the existing bounded per-invocation proof DATA-cost scope, matching the complete context's lifetime. Retain all source, owner, namespace and generated-body checks; introduce no across-call source or verdict cache.
