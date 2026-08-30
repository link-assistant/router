---
bump: patch
---

### Fixed
- A token store written by a previous release accepts writes again. v0.125.0 mapped the store through `link_cli::storage::PersistentFileMapped`, which starts with a logical capacity of zero however much the file already holds, so reopening it read a truncated store — 91 links from a 64 MB file holding 524,766 — and schema validation then failed at the first point past the truncation. Because the dual store answers reads from the text projection, the store looked healthy while every write failed with `doublets schema contains an invalid point` (issue #374).
- The mapping restores the capacity its bytes represent, returns the complete allocation from `grow` rather than only the new tail, and refuses the store's initial bootstrap `shrink` once so the restored capacity is not immediately discarded. `grow_filled`, the safe alternative, cannot be used: despite its documentation it writes the fill value across the persisted region and empties the store, reported as link-foundation/link-cli#102.
