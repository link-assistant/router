---
bump: patch
---

### Fixed
- Prevent concurrent requests from corrupting dual token stores or losing usage counts, and report storage failures as server errors instead of rate limits.
