---
bump: patch
---

### Fixed

- Continue configuration scanning across leading and interleaved outer Rust
  comments, preserving original token arrays and exact attribute spans. Comments
  before a configuration attribute can no longer hide an inactive or unresolved
  condition. Documentation comments gain no owner or inertness authority. Add
  whole-source and checked JavaScript/strict TypeScript regression coverage.
- Pass each explicit profile into the documentation-comment regression so its
  active, absent and unresolved alternatives are all actually exercised.
