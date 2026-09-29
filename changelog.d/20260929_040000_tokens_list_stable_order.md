---
bump: patch
---

### Fixed
- `router tokens list`, the admin token API and the `/tokens` chat command now list tokens oldest first, then by id. They used to follow a per-process hash order, so the same store listed twice gave two different orders. The Docker rolling-update test compared the old backend's `tokens list --json` output byte for byte with its successor's and failed even though no token was lost. That test now compares the records keyed by id (#618).
