---
bump: patch
---

### Fixed
- Exact-tag release preparation now verifies and reuses an existing release after a structured duplicate-tag response, preserving assets and publication state while rejecting other API failures.
- Stale-run sweep tests use independent temporary roots, preventing parallel tests and concurrent test processes from deleting active-lease fixtures during setup.
