---
bump: patch
---

### Fixed
- A release commit records the fragment removals it made. `collect_changelog` deletes the fragments it consumed, but the commit staged only the manifest, lockfile and changelog — so the deletions stayed in the working tree and were never recorded, and the next release collected the same fragments again. That is the accumulation issue #337 was about, reintroduced one layer down: v0.122.0 shipped correctly but left all four fragments pending. The regression test drives a real repository, because staging is a property of the commit rather than of the collector and no unit test could see it (issue #337).
